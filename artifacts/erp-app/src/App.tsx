import { Switch, Route, Router as WouterRouter } from "wouter";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ApiError, setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Purchasing } from "@/pages/Purchasing";
import { Warehouse } from "@/pages/Warehouse";
import { CRM } from "@/pages/CRM";
import { Sales } from "@/pages/Sales";
import { Settings } from "@/pages/Settings";
import { Login } from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { useAuthState } from "@/hooks/use-auth";
import { clearAuth, getAuthToken } from "@/lib/auth";

setAuthTokenGetter(() => getAuthToken());

function handleUnauthorized(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    if (getAuthToken() !== null) {
      clearAuth();
      queryClient.clear();
    }
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthorized }),
  mutationCache: new MutationCache({ onError: handleUnauthorized }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false;
        return failureCount < 1;
      },
    },
  },
});

function ProtectedRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/purchasing" component={Purchasing} />
        <Route path="/warehouse" component={Warehouse} />
        <Route path="/crm" component={CRM} />
        <Route path="/sales" component={Sales} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function AuthGate() {
  const authState = useAuthState();

  if (authState.status === "loading") {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authState.status === "unauthenticated") {
    return <Login />;
  }

  return <ProtectedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
