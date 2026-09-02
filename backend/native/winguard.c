/*
 * winguard.c —— 窗口最小尺寸钩子 DLL
 *
 * 目标：让目标窗口在用户拖拽边框时**根本无法小于**指定尺寸，
 *       而不是「先缩小再被改回来」（后者与拖拽循环互相打架，必然闪烁）。
 *
 * 原理：Windows 在用户拖拽窗口边框前，会向该窗口发送 WM_GETMINMAXINFO
 *       查询尺寸上下限。窗口返回的 MINMAXINFO.ptMinTrackSize 就是
 *       「拖拽能达到的最小尺寸」。我们在此把该字段抬高到 MIN_W x MIN_H，
 *       系统便会在拖拽过程中直接夹住边界 —— 视觉上是「拖到边界就停住」，
 *       用户根本拖不小，也就没有任何闪烁。
 *
 * 为什么必须用 DLL + 钩子：
 *       窗口属于 Chrome 进程，Windows 不允许跨进程替换窗口过程
 *       （SetWindowSubclass / SetWindowLongPtr 只对同进程窗口有效）。
 *       SetWindowsHookEx(WH_CALLWNDPROC) 会让系统把本 DLL 注入目标
 *       进程，从而在目标进程内拦截消息。这是唯一的正规做法。
 *
 * 为什么必须是「线程级」钩子（threadId != 0）：
 *       threadId = 0 是全局钩子，会被注入到系统中**所有** GUI 进程，
 *       极其笨重、拖慢系统、且易被杀软拦截。这里只传目标窗口所属线程，
 *       系统便只注入 Chrome 那一个进程。
 *
 * 架构要求：DLL 位数必须与目标进程一致。Chrome 是 64 位，
 *           故必须用 x64 工具链编译（HostX64\x64\cl.exe）。
 *
 * 编译：
 *   cl /LD /O2 /utf-8 winguard.c /link user32.lib
 */

#include <windows.h>
#include <stdio.h>
#include <stdarg.h>
#include <string.h>

/* 与 Python 端约定的共享内存名（跨进程传递最小尺寸） */
#define SHM_NAME_W L"KKMinW"
#define SHM_NAME_H L"KKMinH"

#define WM_GETMINMAXINFO_T 0x0024

/* 目标窗口标题关键字 */
static const WCHAR TITLE_KEY[] = L"ComfyUI_KK";

#ifdef GUARD_DEBUG
/*
 * 调试日志：默认关闭，编译时加 /DGUARD_DEBUG 开启。
 * 跨进程（DLL 注入到 Chrome）无法用常规 stdout 调试，只能写文件。
 * 日志路径：%TEMP%\kkguard.log
 */
static void logmsg(const char *fmt, ...)
{
    FILE *f;
    va_list ap;
    char path[MAX_PATH * 2];
    if (!GetEnvironmentVariableA("TEMP", path, (DWORD)sizeof(path))) return;
    strcat_s(path, sizeof(path), "\\kkguard.log");
    f = fopen(path, "a");
    if (!f) return;
    va_start(ap, fmt);
    vfprintf(f, fmt, ap);
    va_end(ap);
    fclose(f);
}
#define LOG(...) logmsg(__VA_ARGS__)
#else
#define LOG(...) ((void)0)
#endif

static HINSTANCE g_hinst = NULL;
static HHOOK     g_hook  = NULL;
static HWND      g_hwnd  = NULL;

static HANDLE g_map_w = NULL;
static HANDLE g_map_h = NULL;
static int   *g_min_w = NULL;
static int   *g_min_h = NULL;

BOOL WINAPI DllMain(HINSTANCE hinst, DWORD reason, LPVOID reserved)
{
    (void)reserved;
    if (reason == DLL_PROCESS_ATTACH) {
        g_hinst = hinst;
        /* 不需要线程级附加/分离通知，关掉可避免不必要的开销 */
        DisableThreadLibraryCalls(hinst);
    }
    return TRUE;
}

/*
 * 打开共享内存以读取最小尺寸。
 * 惰性打开：钩子可能先于 Python 创建共享内存被安装，
 * 每次调用都重试，直到拿到值（拿不到时用内置默认值兜底）。
 */
static void shm_open(void)
{
    if (g_map_w) return;

    g_map_w = OpenFileMappingW(FILE_MAP_READ, FALSE, SHM_NAME_W);
    if (g_map_w) g_min_w = (int *)MapViewOfFile(g_map_w, FILE_MAP_READ, 0, 0, sizeof(int));

    g_map_h = OpenFileMappingW(FILE_MAP_READ, FALSE, SHM_NAME_H);
    if (g_map_h) g_min_h = (int *)MapViewOfFile(g_map_h, FILE_MAP_READ, 0, 0, sizeof(int));
}

static int min_w(void) { return (g_min_w && *g_min_w > 0) ? *g_min_w : 1120; }
static int min_h(void) { return (g_min_h && *g_min_h > 0) ? *g_min_h : 700;  }

/* 判断某窗口是否为我们关心的目标 */
static BOOL is_target(HWND hwnd)
{
    WCHAR buf[256];
    int len;
    if (!hwnd || !IsWindow(hwnd)) return FALSE;
    len = GetWindowTextLengthW(hwnd);
    if (len <= 0) return FALSE;
    if (!GetWindowTextW(hwnd, buf, 256)) return FALSE;
    return (wcsstr(buf, TITLE_KEY) != NULL);
}

/*
 * 钩子回调：系统在该线程的消息被派发前调用（运行在 Chrome 进程内）。
 * 我们在 WM_GETMINMAXINFO 到达窗口过程之前改写它的 MINMAXINFO。
 *
 * CWPSTRUCT：lParam 指向它，message 为消息号，
 *            内层的 lParam 字段才是 WM_GETMINMAXINFO 的 MINMAXINFO 指针。
 */
static LRESULT CALLBACK GuardProc(int nCode, WPARAM wParam, LPARAM lParam)
{
    if (nCode >= 0 && lParam) {
        CWPSTRUCT *cwp = (CWPSTRUCT *)lParam;
        if (cwp->message == WM_GETMINMAXINFO_T) {
            WCHAR tbuf[256];
            BOOL tgt;
            tbuf[0] = 0;
            GetWindowTextW(cwp->hwnd, tbuf, 256);
            tgt = is_target(cwp->hwnd);
            LOG("[GuardProc] GETMINMAXINFO hwnd=%p title='%ls' is_target=%d\n",
                (void *)cwp->hwnd, tbuf, (int)tgt);
            if (tgt) {
                MINMAXINFO *mmi = (MINMAXINFO *)cwp->lParam;
                int mw, mh;
                shm_open();
                mw = min_w();
                mh = min_h();
                LOG("[GuardProc] before: mintrack=%ld x %ld, setting to %d x %d (shm w=%d h=%d)\n",
                    mmi->ptMinTrackSize.x, mmi->ptMinTrackSize.y, mw, mh,
                    g_min_w ? *g_min_w : -1, g_min_h ? *g_min_h : -1);
                /*
                 * 只在系统默认值小于下限时抬高，绝不降低 ——
                 * 否则会破坏最大化/全屏等系统默认行为。
                 */
                if (mmi->ptMinTrackSize.x < mw) mmi->ptMinTrackSize.x = mw;
                if (mmi->ptMinTrackSize.y < mh) mmi->ptMinTrackSize.y = mh;
                LOG("[GuardProc] after:  mintrack=%ld x %ld\n",
                    mmi->ptMinTrackSize.x, mmi->ptMinTrackSize.y);
            }
        }
    }
    return CallNextHookEx(g_hook, nCode, wParam, lParam);
}

/*
 * 供 Python 端调用：为目标窗口安装线程级钩子。
 * 成功返回 TRUE；失败时 Python 端应回退到轮询方案。
 */
__declspec(dllexport) BOOL InstallGuardForWindow(HWND hwnd)
{
    DWORD tid;
    HHOOK h;

    if (!hwnd || !IsWindow(hwnd)) {
        LOG("[Install] invalid hwnd=%p\n", (void *)hwnd);
        return FALSE;
    }
    if (g_hook) {
        LOG("[Install] already installed\n");
        return TRUE;
    }

    /* 取窗口所属线程：只对该线程挂钩，避免全局注入 */
    tid = GetWindowThreadProcessId(hwnd, NULL);
    LOG("[Install] hwnd=%p tid=%lu\n", (void *)hwnd, (unsigned long)tid);
    if (!tid) return FALSE;

    shm_open();
    LOG("[Install] shm: w=%d h=%d\n", g_min_w ? *g_min_w : -1, g_min_h ? *g_min_h : -1);

    g_hwnd = hwnd;
    h = SetWindowsHookExW(WH_CALLWNDPROC, GuardProc, g_hinst, tid);
    LOG("[Install] SetWindowsHookEx -> %p (err=%lu)\n", (void *)h, (unsigned long)GetLastError());
    if (!h) return FALSE;
    g_hook = h;
    return TRUE;
}

/* 供测试：返回钩子是否已安装 */
__declspec(dllexport) BOOL IsGuardInstalled(void)
{
    return (g_hook != NULL);
}

/*
 * 供测试：在钩子链内派发一次 WM_GETMINMAXINFO 并返回结果。
 *
 * 为什么需要它：外部用 SendMessageW 直接发该消息会绕过
 * DispatchMessage，钩子拦截不到，导致测试永远看到原始值
 * （开发中踩过）。这里用 PostMessage + PeekMessage 强制消息
 * 走派发路径，从而在钩子内拿到真实生效值。
 */
__declspec(dllexport) BOOL QueryMinTrack(HWND hwnd, LONG *out_w, LONG *out_h)
{
    MINMAXINFO mmi;
    MSG msg;
    DWORD t0;

    if (!hwnd || !is_target(hwnd)) return FALSE;
    if (!out_w || !out_h) return FALSE;

    memset(&mmi, 0, sizeof(mmi));
    if (!PostMessageW(hwnd, WM_GETMINMAXINFO_T, 0, (LPARAM)&mmi)) return FALSE;

    /* 等该消息被派发处理完（钩子会在 DispatchMessage 时改写 mmi） */
    t0 = GetTickCount();
    while (GetTickCount() - t0 < 1000) {
        if (PeekMessageW(&msg, hwnd, WM_GETMINMAXINFO_T, WM_GETMINMAXINFO_T, PM_REMOVE)) {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
            break;
        }
        Sleep(5);
    }

    *out_w = mmi.ptMinTrackSize.x;
    *out_h = mmi.ptMinTrackSize.y;
    return TRUE;
}

__declspec(dllexport) void RemoveGuard(void)
{
    if (g_hook) {
        UnhookWindowsHookEx(g_hook);
        g_hook = NULL;
    }
    if (g_min_w) { UnmapViewOfFile(g_min_w); g_min_w = NULL; }
    if (g_min_h) { UnmapViewOfFile(g_min_h); g_min_h = NULL; }
    if (g_map_w) { CloseHandle(g_map_w); g_map_w = NULL; }
    if (g_map_h) { CloseHandle(g_map_h); g_map_h = NULL; }
}
