import { PageLoadingState } from "../../components/feedback";

export default function Loading() {
  return (
    <PageLoadingState
      description="Loading filters, matching sessions, and the latest imported activity summaries."
      title="Loading activities"
    />
  );
}
