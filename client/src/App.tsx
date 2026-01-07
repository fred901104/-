import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import Streams from "./pages/Streams";
import Trades from "./pages/Trades";
import Settlements from "./pages/Settlements";
import Users from "./pages/Users";
import PointsConfig from "./pages/PointsConfig";
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Dashboard} />
        <Route path={"/points-config"} component={PointsConfig} />
        <Route path={"/tickets"} component={Tickets} />
        <Route path={"/streams"} component={Streams} />
        <Route path={"/trades"} component={Trades} />
        <Route path={"/settlements"} component={Settlements} />
        <Route path={"/users"} component={Users} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
