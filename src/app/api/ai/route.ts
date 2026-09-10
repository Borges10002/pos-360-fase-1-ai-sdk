import { openRouter } from "@/ai/open-router";
import { generateText, stepCountIs, tool } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const githubUsernameSchema = z
    .string()
    .min(1)
    .max(39)
    .regex(
        /^(?!-)(?!.*--)[a-zA-Z0-9-]+(?<!-)$/,
        "Username inválido do GitHub",
    );

async function fetchGitHub(url: URL) {
    if (
        url.protocol !== "https:" ||
        url.hostname !== "api.github.com" ||
        url.port !== ""
    ) {
        throw new Error("Apenas URLs HTTPS da API do GitHub são permitidas.");
    }

    const headers: HeadersInit = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };

    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
        throw new Error(
            `A API do GitHub respondeu com ${response.status} ${response.statusText}.`,
        );
    }

    return response.json() as Promise<unknown>;
}

export async function GET() {
    try {
        const result = await generateText({
            model: openRouter.chat("openai/gpt-4o-2024-11-20"),
            tools: {
                getGitHubProfile: tool({
                    description: "Busca o perfil público de um usuário do GitHub.",
                    inputSchema: z.object({
                        username: githubUsernameSchema.describe(
                            "Username do usuário no GitHub",
                        ),
                    }),
                    execute: async ({ username }) =>
                        fetchGitHub(
                            new URL(
                                `/users/${encodeURIComponent(username)}`,
                                "https://api.github.com",
                            ),
                        ),
                }),
                fetchGitHubApi: tool({
                    description:
                        "Acessa uma URL HTTPS da API do GitHub para buscar organizações, repositórios, eventos, seguidores ou usuários seguidos.",
                    inputSchema: z.object({
                        url: z
                            .url()
                            .describe("URL completa pertencente a api.github.com"),
                    }),
                    execute: async ({ url }) => fetchGitHub(new URL(url)),
                }),
            },
            prompt:
                "Dê uma lista dos usuários que o usuário Borges10002 segue no GitHub.",
            stopWhen: stepCountIs(5),
        });

        return NextResponse.json({
            message: result.text,
            parts: result.toolResults,
        });
    } catch (error) {
        console.error("Falha ao consultar a IA:", error);

        return NextResponse.json(
            { error: "Não foi possível concluir a consulta." },
            { status: 500 },
        );
    }
}
