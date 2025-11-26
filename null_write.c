#define _GNU_SOURCE
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <ucontext.h>
#include <execinfo.h>
#include <unistd.h>

static void on_segv(int sig, siginfo_t *si, void *ctx) {
    (void)ctx;
    fprintf(stderr, "Peguei SIGSEGV (signal %d) ao acessar %p\n", sig, si->si_addr);
    void *stack[32];
    int n = backtrace(stack, 32);
    backtrace_symbols_fd(stack, n, STDERR_FILENO);
    _exit(128 + sig); // encerra imediatamente (async-signal-safe)
}

int main(void) {
    struct sigaction sa = {0};
    sa.sa_sigaction = on_segv;
    sa.sa_flags = SA_SIGINFO;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGSEGV, &sa, NULL);

    volatile int *p = (int *)0;  // NULL
    *p = 42;                     // vai disparar o handler
    return 0;
}
