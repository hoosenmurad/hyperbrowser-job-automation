import { NextRequest, NextResponse } from "next/server";
import { getHyperbrowserClient } from "@/lib/hyperbrowser/client";
import { BrowserAgent } from "@/lib/hyperbrowser/browser-agent";
import { config } from "@/lib/config";
import { log } from "@/lib/logger";

// GET /api/sessions - Test browser connection
export async function GET() {
  try {
    log.info("Testing Hyperbrowser connection...");

    const client = getHyperbrowserClient();
    const agent = new BrowserAgent(client, process.env.ANTHROPIC_API_KEY);

    log.process("Testing Computer Use connection...");

    const result = await agent.executeComputerUseTask(
      "Go to https://example.com and tell me the page title",
      config.TEST_MAX_STEPS,
      undefined,
      false
    );

    agent.closeSession();

    if (result.success) {
      log.success("Connection test completed successfully");
      return NextResponse.json({
        success: true,
        message: "Hyperbrowser connection successful",
        result: result.result?.slice(0, 200),
        browserUrl: result.browserUrl,
        recordingUrl: result.recordingUrl,
      });
    } else {
      log.error(`Connection test failed: ${result.error}`);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    log.error(`Browser connection test failed: ${error}`);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Execute a custom task
export async function POST(request: NextRequest) {
  try {
    const { task, maxSteps } = await request.json();

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task is required" },
        { status: 400 }
      );
    }

    log.process(`Executing custom task: ${task.slice(0, 100)}...`);

    const client = getHyperbrowserClient();
    const agent = new BrowserAgent(client, process.env.ANTHROPIC_API_KEY);

    const result = await agent.executeComputerUseTask(
      task,
      maxSteps || config.SEARCH_MAX_STEPS,
      undefined,
      true
    );

    return NextResponse.json({
      success: result.success,
      result: result.result,
      error: result.error,
      sessionId: result.sessionId,
      stepsTaken: result.stepsTaken,
      browserUrl: result.browserUrl,
      recordingUrl: result.recordingUrl,
    });
  } catch (error) {
    log.error(`Task execution failed: ${error}`);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

