using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace AppAudio;

internal static partial class WindowList
{
    private const uint GW_OWNER = 4;
    private const int DWMWA_CLOAKED = 14;

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowTextW(IntPtr hWnd, StringBuilder text, int maxCount);

    [DllImport("user32.dll")]
    private static extern int GetWindowTextLengthW(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    private static extern IntPtr GetWindow(IntPtr hWnd, uint command);

    [DllImport("dwmapi.dll")]
    private static extern int DwmGetWindowAttribute(IntPtr hWnd, int attribute, out int value, int size);

    // the same windows alt-tab would offer: visible, titled, not owned by another window, and
    // not cloaked (a suspended store app, or a window on another virtual desktop)
    private static bool IsPickable(IntPtr hWnd)
    {
        if (!IsWindowVisible(hWnd)) return false;
        if (GetWindow(hWnd, GW_OWNER) != IntPtr.Zero) return false;
        if (GetWindowTextLengthW(hWnd) == 0) return false;

        return DwmGetWindowAttribute(hWnd, DWMWA_CLOAKED, out var cloaked, sizeof(int)) != 0
            || cloaked == 0;
    }

    public static List<WindowInfo> Get()
    {
        var windows = new List<WindowInfo>();
        var ownPid = (uint)Environment.ProcessId;

        EnumWindows(
            (hWnd, _) =>
            {
                if (!IsPickable(hWnd)) return true;

                GetWindowThreadProcessId(hWnd, out var pid);

                if (pid == ownPid) return true;

                var length = GetWindowTextLengthW(hWnd);
                var title = new StringBuilder(length + 1);

                GetWindowTextW(hWnd, title, title.Capacity);

                var name = "";

                try
                {
                    name = Process.GetProcessById((int)pid).ProcessName;
                }
                catch
                {
                    // gone between listing and asking, or a protected system process
                }

                windows.Add(new WindowInfo(hWnd.ToInt64(), pid, name, title.ToString()));

                return true;
            },
            IntPtr.Zero
        );

        return windows;
    }
}
