import { Component, createRef, type ReactNode } from "react";
import { browserNetwork } from "../services/browser-ports";
import { recoveryActions, recoveryCopy, type RecoveryActionId } from "../services/connection";
import type { NetworkStatus } from "../services/ports";
import { navigateToSection } from "../lib/page-navigation";
import { Button } from "./ui/button";

interface BoundaryState {
  failed: boolean;
  offline: boolean;
}

/** Keep navigation and the active forecast available when a view fails to render or download. */
export class WorkspaceBoundary extends Component<
  { children: ReactNode; onPlan: () => void; contentId: string; network?: NetworkStatus },
  BoundaryState
> {
  state: BoundaryState = { failed: false, offline: false };
  private notice = createRef<HTMLElement>();
  private unsubscribe = () => {};
  private network(): NetworkStatus {
    return this.props.network ?? browserNetwork;
  }

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  componentDidMount() {
    this.setState({ offline: !this.network().online() });
    this.unsubscribe = this.network().subscribe((online) => this.setState({ offline: !online }));
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  componentDidCatch() {
    this.setState({ offline: !this.network().online() });
    if (this.notice.current) navigateToSection(this.notice.current.id);
  }

  private recover(id: RecoveryActionId) {
    const actions: Record<RecoveryActionId, () => void> = {
      // Both React.lazy and the browser can retain a rejected module load. A fresh
      // document retries the download while keeping the forecast in the URL.
      retry: () => window.location.reload(),
      plan: () => {
        this.setState({ failed: false });
        this.props.onPlan();
      },
    };
    actions[id]();
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
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{recoveryCopy(this.state.offline)}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {recoveryActions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.emphasis === "outline" ? "outline" : "default"}
              onClick={() => this.recover(action.id)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </section>
    );
  }
}
