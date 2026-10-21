import { Component, createRef, type ReactNode } from "react";
import { navigateToSection } from "../lib/page-navigation";
import { Button } from "./ui/button";

interface BoundaryState {
  failed: boolean;
  offline: boolean;
}

/** Keep navigation and the active forecast available when a view fails to render or download. */
export class WorkspaceBoundary extends Component<
  { children: ReactNode; onPlan: () => void; contentId: string },
  BoundaryState
> {
  state: BoundaryState = { failed: false, offline: false };
  private notice = createRef<HTMLElement>();
  private syncConnection = () => this.setState({ offline: navigator.onLine === false });

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  componentDidMount() {
    window.addEventListener("online", this.syncConnection);
    window.addEventListener("offline", this.syncConnection);
  }

  componentWillUnmount() {
    window.removeEventListener("online", this.syncConnection);
    window.removeEventListener("offline", this.syncConnection);
  }

  componentDidCatch() {
    this.syncConnection();
    if (this.notice.current) navigateToSection(this.notice.current.id);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section
        ref={this.notice}
        id="workspace-error"
        tabIndex={-1}
        role="alert"
        className="mx-auto my-10 max-w-xl rounded-xl border bg-card p-6"
      >
        <h1 id={this.props.contentId} tabIndex={-1} className="text-xl font-semibold">
          This view couldn’t load
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Something went wrong while drawing this view. Your forecast is still saved in the page address.
          {this.state.offline
            ? " You appear to be offline. The plan can still open from the prices already in this page."
            : " Try again, or return to your plan."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={() => this.setState({ failed: false })}>
            Try again
          </Button>
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            Reload view
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              this.setState({ failed: false });
              this.props.onPlan();
            }}
          >
            Return to plan
          </Button>
        </div>
      </section>
    );
  }
}
