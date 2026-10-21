using System.Runtime.InteropServices;

namespace AppAudio;

// windows' process loopback, after microsoft's ApplicationLoopback sample: activate an audio
// client on the virtual process loopback device, then read it like any loopback capture
internal static class ProcessLoopback
{
    private const string VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK = "VAD\\Process_Loopback";
    private const int AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK = 1;
    private const int PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE = 0;
    private const int PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE = 1;
    private const ushort VT_BLOB = 65;

    private const int AUDCLNT_SHAREMODE_SHARED = 0;
    private const uint AUDCLNT_STREAMFLAGS_LOOPBACK = 0x00020000;
    private const uint AUDCLNT_STREAMFLAGS_EVENTCALLBACK = 0x00040000;
    private const uint AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM = 0x80000000;
    private const uint AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY = 0x08000000;
    private const uint AUDCLNT_BUFFERFLAGS_SILENT = 0x2;

    private const int SAMPLE_RATE = 48000;
    private const int CHANNELS = 2;
    private const int BYTES_PER_FRAME = CHANNELS * 2;

    // 100 ns units: room for the reader to fall a little behind without losing sound
    private const long BUFFER_DURATION = 1_000_000;

    private static readonly Guid IID_IAudioClient = new("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2");
    private static readonly Guid IID_IAudioCaptureClient = new("C8ADBD64-E71E-48a0-A4DE-185C395CD317");

    [StructLayout(LayoutKind.Sequential)]
    private struct AudioClientActivationParams
    {
        public int ActivationType;
        public uint TargetProcessId;
        public int ProcessLoopbackMode;
    }

    // a PROPVARIANT holding a BLOB, laid out the way the 64 bit ABI expects
    [StructLayout(LayoutKind.Sequential)]
    private struct PropVariantBlob
    {
        public ushort Vt;
        public ushort Reserved1;
        public ushort Reserved2;
        public ushort Reserved3;
        public uint Size;
        public IntPtr Data;
    }

    [StructLayout(LayoutKind.Sequential, Pack = 2)]
    private struct WaveFormatEx
    {
        public ushort FormatTag;
        public ushort Channels;
        public uint SamplesPerSec;
        public uint AvgBytesPerSec;
        public ushort BlockAlign;
        public ushort BitsPerSample;
        public ushort Size;
    }

    [ComImport, Guid("41D949AB-9862-444A-80F6-C261334DA5EB"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IActivateAudioInterfaceCompletionHandler
    {
        void ActivateCompleted(IActivateAudioInterfaceAsyncOperation activateOperation);
    }

    [ComImport, Guid("72A22D78-CDE4-431D-B8CC-843A71199B6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IActivateAudioInterfaceAsyncOperation
    {
        void GetActivateResult(
            out int activateResult,
            [MarshalAs(UnmanagedType.IUnknown)] out object activatedInterface
        );
    }

    // tells the system the handler can be called from any thread, which ActivateAudioInterfaceAsync
    // requires of it
    [ComImport, Guid("94EA2B94-E9CC-49E0-C0FF-EE64CA8F5B90"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAgileObject { }

    [ComImport, Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioClient
    {
        [PreserveSig] int Initialize(int shareMode, uint streamFlags, long bufferDuration, long periodicity, IntPtr format, IntPtr audioSessionGuid);
        [PreserveSig] int GetBufferSize(out uint bufferFrameCount);
        [PreserveSig] int GetStreamLatency(out long latency);
        [PreserveSig] int GetCurrentPadding(out uint paddingFrameCount);
        [PreserveSig] int IsFormatSupported(int shareMode, IntPtr format, out IntPtr closestMatch);
        [PreserveSig] int GetMixFormat(out IntPtr deviceFormat);
        [PreserveSig] int GetDevicePeriod(out long defaultDevicePeriod, out long minimumDevicePeriod);
        [PreserveSig] int Start();
        [PreserveSig] int Stop();
        [PreserveSig] int Reset();
        [PreserveSig] int SetEventHandle(IntPtr eventHandle);
        [PreserveSig] int GetService(ref Guid riid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
    }

    [ComImport, Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioCaptureClient
    {
        [PreserveSig] int GetBuffer(out IntPtr data, out uint numFramesToRead, out uint flags, out ulong devicePosition, out ulong qpcPosition);
        [PreserveSig] int ReleaseBuffer(uint numFramesRead);
        [PreserveSig] int GetNextPacketSize(out uint numFramesInNextPacket);
    }

    [ComVisible(true)]
    private sealed class ActivationHandler : IActivateAudioInterfaceCompletionHandler, IAgileObject
    {
        public readonly ManualResetEventSlim Done = new(false);
        public IAudioClient? Client;
        public int Result;

        public void ActivateCompleted(IActivateAudioInterfaceAsyncOperation activateOperation)
        {
            activateOperation.GetActivateResult(out Result, out var activated);

            if (Result >= 0) Client = (IAudioClient)activated;

            Done.Set();
        }
    }

    [DllImport("Mmdevapi.dll", ExactSpelling = true, PreserveSig = false)]
    private static extern void ActivateAudioInterfaceAsync(
        [MarshalAs(UnmanagedType.LPWStr)] string deviceInterfacePath,
        [MarshalAs(UnmanagedType.LPStruct)] Guid riid,
        IntPtr activationParams,
        IActivateAudioInterfaceCompletionHandler completionHandler,
        out IActivateAudioInterfaceAsyncOperation activationOperation
    );

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr CreateEventW(IntPtr attributes, bool manualReset, bool initialState, string? name);

    [DllImport("kernel32.dll")]
    private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

    [DllImport("kernel32.dll")]
    private static extern bool CloseHandle(IntPtr handle);

    private static void Check(int hr, string what)
    {
        if (hr < 0) throw new InvalidOperationException($"{what} failed (0x{hr:X8})");
    }

    private static IAudioClient Activate(uint pid, bool includeTree)
    {
        var activation = new AudioClientActivationParams
        {
            ActivationType = AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK,
            TargetProcessId = pid,
            ProcessLoopbackMode = includeTree
                ? PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE
                : PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE
        };

        var activationPtr = Marshal.AllocHGlobal(Marshal.SizeOf<AudioClientActivationParams>());
        var propVariantPtr = Marshal.AllocHGlobal(Marshal.SizeOf<PropVariantBlob>());

        try
        {
            Marshal.StructureToPtr(activation, activationPtr, false);
            Marshal.StructureToPtr(
                new PropVariantBlob
                {
                    Vt = VT_BLOB,
                    Size = (uint)Marshal.SizeOf<AudioClientActivationParams>(),
                    Data = activationPtr
                },
                propVariantPtr,
                false
            );

            var handler = new ActivationHandler();

            ActivateAudioInterfaceAsync(
                VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,
                IID_IAudioClient,
                propVariantPtr,
                handler,
                out _
            );

            if (!handler.Done.Wait(TimeSpan.FromSeconds(5)))
            {
                throw new InvalidOperationException("Windows did not answer the audio capture request");
            }

            // 0x80070057 (bad argument) is what windows before build 20348 says to a process
            // loopback request
            if (handler.Result == unchecked((int)0x80070057))
            {
                throw new InvalidOperationException(
                    "Capturing one app's sound needs Windows 11 (or Windows 10 build 20348 and later)"
                );
            }

            Check(handler.Result, "Starting the app audio capture");

            return handler.Client!;
        }
        finally
        {
            Marshal.FreeHGlobal(propVariantPtr);
            Marshal.FreeHGlobal(activationPtr);
        }
    }

    public static int Capture(uint pid, bool includeTree)
    {
        var client = Activate(pid, includeTree);

        // process loopback has no mix format of its own, so it is told what to deliver and
        // converts to it
        var format = new WaveFormatEx
        {
            FormatTag = 1,
            Channels = CHANNELS,
            SamplesPerSec = SAMPLE_RATE,
            AvgBytesPerSec = SAMPLE_RATE * BYTES_PER_FRAME,
            BlockAlign = BYTES_PER_FRAME,
            BitsPerSample = 16,
            Size = 0
        };

        var formatPtr = Marshal.AllocHGlobal(Marshal.SizeOf<WaveFormatEx>());
        var captureEvent = CreateEventW(IntPtr.Zero, false, false, null);

        try
        {
            Marshal.StructureToPtr(format, formatPtr, false);

            Check(
                client.Initialize(
                    AUDCLNT_SHAREMODE_SHARED,
                    AUDCLNT_STREAMFLAGS_LOOPBACK
                        | AUDCLNT_STREAMFLAGS_EVENTCALLBACK
                        | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM
                        | AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY,
                    BUFFER_DURATION,
                    0,
                    formatPtr,
                    IntPtr.Zero
                ),
                "Preparing the app audio capture"
            );

            Check(client.SetEventHandle(captureEvent), "Setting up the capture event");

            var captureIid = IID_IAudioCaptureClient;

            Check(client.GetService(ref captureIid, out var captureService), "Opening the capture");

            var capture = (IAudioCaptureClient)captureService;

            Check(client.Start(), "Starting the capture");

            var stopped = false;

            // the app that started this closes stdin when it stops or quits, and the capture
            // must not outlive it
            var stdinWatcher = new Thread(() =>
            {
                try
                {
                    using var stdin = Console.OpenStandardInput();
                    var buffer = new byte[64];

                    while (stdin.Read(buffer, 0, buffer.Length) > 0) { }
                }
                catch
                {
                    // a broken pipe means the same as a closed one
                }

                stopped = true;
            })
            {
                IsBackground = true
            };

            stdinWatcher.Start();

            using var stdout = Console.OpenStandardOutput();
            var bytes = new byte[SAMPLE_RATE * BYTES_PER_FRAME];

            while (!stopped)
            {
                WaitForSingleObject(captureEvent, 100);

                while (capture.GetNextPacketSize(out var packetFrames) >= 0 && packetFrames > 0)
                {
                    Check(
                        capture.GetBuffer(out var data, out var frames, out var flags, out _, out _),
                        "Reading the captured sound"
                    );

                    var length = (int)frames * BYTES_PER_FRAME;

                    if (length > bytes.Length) bytes = new byte[length];

                    if ((flags & AUDCLNT_BUFFERFLAGS_SILENT) != 0)
                    {
                        Array.Clear(bytes, 0, length);
                    }
                    else
                    {
                        Marshal.Copy(data, bytes, 0, length);
                    }

                    capture.ReleaseBuffer(frames);

                    try
                    {
                        stdout.Write(bytes, 0, length);
                    }
                    catch (IOException)
                    {
                        stopped = true;

                        break;
                    }
                }

                stdout.Flush();
            }

            client.Stop();

            return 0;
        }
        finally
        {
            CloseHandle(captureEvent);
            Marshal.FreeHGlobal(formatPtr);
        }
    }
}
