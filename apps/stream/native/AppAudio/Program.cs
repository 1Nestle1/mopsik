// AppAudio: the part of MOPSCORD Stream that browsers can't do.
//
//   AppAudio list
//     prints the visible windows as json: [{ "hwnd", "pid", "name", "title" }]
//
//   AppAudio capture <pid> <include|exclude>
//     writes the sound of that process tree (include), or of everything but it (exclude), to
//     stdout as raw pcm: 48 kHz, 16 bit signed little endian, 2 channels, interleaved.
//     stops when stdin closes, which is what happens when the app that started it goes away.
//
// built on windows' process loopback (windows 11, or windows 10 build 20348 and later).

using System.Text.Json;
using System.Text.Json.Serialization;

namespace AppAudio;

internal static class Program
{
    private static int Main(string[] args)
    {
        try
        {
            if (args.Length >= 1 && args[0] == "list")
            {
                var windows = WindowList.Get();

                Console.Out.Write(
                    JsonSerializer.Serialize(windows, AppAudioJson.Default.ListWindowInfo)
                );

                return 0;
            }

            if (
                args.Length >= 3
                && args[0] == "capture"
                && uint.TryParse(args[1], out var pid)
                && (args[2] == "include" || args[2] == "exclude")
            )
            {
                return ProcessLoopback.Capture(pid, args[2] == "include");
            }

            Console.Error.WriteLine("usage: AppAudio list | capture <pid> <include|exclude>");

            return 2;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error.Message);

            return 1;
        }
    }
}

internal sealed record WindowInfo(
    [property: JsonPropertyName("hwnd")] long Hwnd,
    [property: JsonPropertyName("pid")] uint Pid,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("title")] string Title
);

// source generated, so trimming the exe keeps the serializer working
[JsonSerializable(typeof(List<WindowInfo>))]
internal sealed partial class AppAudioJson : JsonSerializerContext { }
