import { Component, createRef, type ReactNode } from "react";
import { navigateToSection } from "../lib/page-navigation";
import { Button } from "./ui/button";

/** Keep navigation and the active forecast available when a view fails to render or download. */
export class WorkspaceBoundary extends Component<{ children: ReactNode; onPlan: () => void }, { failed: boolean }> {
  state = { failed: false };
  private notice = createRef<HTMLElement>();

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
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
        <h1 className="text-xl font-semibold">This view couldn’t load</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your last valid forecast remains in this page’s address. Reload to try again, or return to your plan.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={() => window.location.reload()}>
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
