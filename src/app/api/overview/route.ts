import { auth } from "@/lib/auth";
import { getOverviewFilter, type OverviewFilterId } from "@/lib/overview-filters";
import { generateEmailOverview } from "@/server/overview/generate-overview";
import { fail, handleApiError, ok } from "@/server/http";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const filterParam = searchParams.get("filter");
  const filter = getOverviewFilter(filterParam);
  const filterId = filter.id as OverviewFilterId;

  try {
    const overview = await generateEmailOverview(session.user.id, filterId);
    return ok(overview);
  } catch (error) {
    return handleApiError(error, "GET /api/overview");
  }
}
