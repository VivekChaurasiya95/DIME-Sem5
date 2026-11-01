import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "../../../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const targetAudience = typeof body?.targetAudience === "string" ? body.targetAudience.trim().toLowerCase() : "";
    const industrySource = typeof body?.industry === "string" ? body.industry : body?.domain;
    const industry = typeof industrySource === "string" ? industrySource.trim() : "";
    
    // New validation fields
    const formFactors = Array.isArray(body?.formFactors) ? JSON.stringify(body.formFactors) : null;
    const budget = typeof body?.budget === "string" ? body.budget : null;
    const teamSize = typeof body?.teamSize === "string" ? body.teamSize : null;
    const timeline = typeof body?.timeline === "string" ? body.timeline : null;
    const preferredTechnologies = Array.isArray(body?.preferredTechnologies) 
      ? JSON.stringify(body.preferredTechnologies) 
      : (typeof body?.preferredTechnologies === "string" ? body.preferredTechnologies : null);
    const analysisDepth = typeof body?.analysisDepth === "string" ? body.analysisDepth : "STANDARD";

    if (!title || !description || !targetAudience || !industry) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    if (title.length < 4 || description.length < 30) {
      return new NextResponse(
        "Title or description is too short for meaningful analysis",
        { status: 400 },
      );
    }

    // 1. Resolve or create the idea in Prisma
    let targetIdeaId = typeof body?.ideaId === "string" ? body.ideaId : null;
    if (targetIdeaId) {
      const existing = await prisma.idea.findFirst({
        where: { id: targetIdeaId, userId: session.user.id },
      });
      if (existing) {
        await prisma.idea.update({
          where: { id: targetIdeaId },
          data: {
            status: "ANALYZING",
            formFactors,
            budget,
            teamSize,
            timeline,
            preferredTechnologies,
            analysisDepth,
          },
        });
      } else {
        targetIdeaId = null;
      }
    }

    if (!targetIdeaId) {
      const created = await prisma.idea.create({
        data: {
          title,
          description,
          targetAudience,
          industry,
          userId: session.user.id,
          status: "ANALYZING",
          formFactors,
          budget,
          teamSize,
          timeline,
          preferredTechnologies,
          analysisDepth,
        },
      });
      targetIdeaId = created.id;
    }

    // 2. Send request to FastAPI backend with bounded timeout
    const candidateUrls = [
      process.env.FASTAPI_URL,
      "http://127.0.0.1:8000",
      "http://localhost:8000",
    ].filter(Boolean) as string[];

    let fastApiResponse: Response | null = null;
    let fastApiError: string | null = null;

    const payload = JSON.stringify({
      title,
      description,
      targetAudience,
      industry,
      analysisDepth,
      budget,
      teamSize,
      timeline,
      preferredTechnologies,
      formFactors,
      idea_id: targetIdeaId,
      user_id: session.user.id,
    });

    for (const url of Array.from(new Set(candidateUrls))) {
      try {
        fastApiResponse = await fetch(`${url}/api/v1/analyses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: payload,
          signal: AbortSignal.timeout(12000), // 12-second bounded timeout
        });
        if (fastApiResponse.ok) {
          break;
        } else {
          fastApiError = await fastApiResponse.text();
        }
      } catch (err: any) {
        console.warn(`Attempt to call FastAPI at ${url} failed: ${err.message}`);
        fastApiError = err.message;
      }
    }

    if (!fastApiResponse || !fastApiResponse.ok) {
      console.error("FastAPI Error across all candidates:", fastApiError);
      return NextResponse.json(
        { 
          error: "Backend Service Unavailable", 
          detail: fastApiError || "The analysis backend timed out or could not be reached."
        },
        { status: 502 }
      );
    }

    const fastApiData = await fastApiResponse.json();
    const analysisId = fastApiData.id;

    // Create notification after successful submission
    try {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          title: "Analysis Started",
          message: title,
          type: "analysis_started",
        },
      });
    } catch (notifErr) {
      console.warn("Could not create notification (non-fatal):", notifErr);
    }

    return NextResponse.json({
      id: analysisId,
      db_idea_id: targetIdeaId,
      status: "pending",
      message: "Analysis queued successfully",
    });
  } catch (error: any) {
    console.error("IDEA_START_ANALYSIS_ERROR", error);
    return NextResponse.json(
      { error: "Internal Server Error", detail: error?.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

