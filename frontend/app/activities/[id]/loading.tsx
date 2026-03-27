import { PageLoadingState } from "../../../components/feedback";

export default function Loading() {
  return (
    <PageLoadingState
      description="Loading the activity summary, map, laps, and record samples for this session."
      title="Loading activity detail"
    />
  );
}
