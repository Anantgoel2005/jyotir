import { ReadingStudio } from "@/components/ReadingStudio"

export default async function ReadingPage({
  params,
}: {
  params: Promise<{ chartId: string }>
}) {
  const { chartId } = await params
  return <ReadingStudio chartId={chartId} />
}
