import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "Untitled Idea";
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

    if (!title) {
      return new NextResponse("Missing title", { status: 400 });
    }

    const idea = await prisma.idea.create({
      data: {
        title,
        description,
        targetAudience,
        industry,
        formFactors,
        budget,
        teamSize,
        timeline,
        preferredTechnologies,
        analysisDepth,
        status: "DRAFT",
        userId: session.user.id,
      },
    });

    return NextResponse.json(idea);
  } catch (error: unknown) {
    console.error("IDEA_CREATION_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") ?? 50);

    const ideas = await prisma.idea.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50,
    });

    return NextResponse.json(ideas);
  } catch (error: unknown) {
    console.error("IDEAS_FETCH_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
