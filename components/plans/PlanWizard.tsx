"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CategoryBadge } from "@/components/ui/Badge";
import { PlanResult } from "./PlanResult";
import type { Artist, Plan } from "@/types";

type Step = 1 | 2 | 3 | 4 | 5;

interface WizardState {
  artistId: string | null;
  artistName: string | null;
  eventName: string;
  venueHint: string;
  eventDate: string;
  eventTime: string;
  departure: string;
  budgetHint: string;
  stayOvernight: boolean;
  merch: boolean;
  pilgrimage: boolean;
}

const INITIAL_STATE: WizardState = {
  artistId: null,
  artistName: null,
  eventName: "",
  venueHint: "",
  eventDate: "",
  eventTime: "",
  departure: "",
  budgetHint: "",
  stayOvernight: false,
  merch: false,
  pilgrimage: false,
};

interface PlanWizardProps {
  artists: Artist[];
  homeStation: string;
  isLoggedIn: boolean;
  initialVenue?: string;
}

const STEP_DOTS = [1, 2, 3] as const;

export function PlanWizard({
  artists,
  homeStation,
  isLoggedIn,
  initialVenue = "",
}: PlanWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<WizardState>({
    ...INITIAL_STATE,
    departure: homeStation,
    venueHint: initialVenue,
  });
  const [generatedPlan, setGeneratedPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [loadingSteps, setLoadingSteps] = useState([false, false, false, false]);

  const today = new Date().toISOString().split("T")[0];

  // ---- Step 1: Artist Selection ----
  if (step === 1) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-gray-400 hover:text-gray-600">✕ キャンセル</Link>
          <StepDots current={1} />
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-900">誰の遠征を計画しますか？</h1>
        <p className="mb-6 text-sm text-gray-500">スキップして会場名だけでも作れます</p>

        {artists.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {artists.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setState((s) => ({ ...s, artistId: a.id, artistName: a.name }));
                    setStep(2);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:border-purple-300 hover:bg-purple-50 ${state.artistId === a.id ? "border-purple-500 bg-purple-50" : "border-gray-200 bg-white"}`}
                >
                  <CategoryBadge category={a.category} />
                  <span className="font-medium">{a.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {isLoggedIn && (
          <Link href="/artists/new" className="mb-6 block text-sm text-purple-600 hover:underline">
            ＋ 推しを新たに登録する
          </Link>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setState((s) => ({ ...s, artistId: null, artistName: null }));
              setStep(2);
            }}
          >
            スキップして次へ
          </Button>
          {state.artistId && (
            <Button className="flex-1" onClick={() => setStep(2)}>
              次へ →
            </Button>
          )}
        </div>
      </main>
    );
  }

  // ---- Step 2: Event Info ----
  if (step === 2) {
    const handleNext = () => {
      if (!state.eventName || !state.venueHint || !state.eventDate || !state.departure) {
        setError("必須項目を入力してください");
        return;
      }
      setError("");
      setStep(3);
    };

    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button type="button" onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600">← 戻る</button>
          <StepDots current={2} />
        </div>
        <h1 className="mb-6 text-xl font-bold text-gray-900">公演情報を入力</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex flex-col gap-4">
          <Input id="eventName" label="公演名" required placeholder="○○ ARENA TOUR 2026"
            value={state.eventName} onChange={(e) => setState((s) => ({ ...s, eventName: e.target.value }))} maxLength={80} />

          <Input id="venueHint" label="会場名" required placeholder="東京ドーム"
            value={state.venueHint} onChange={(e) => setState((s) => ({ ...s, venueHint: e.target.value }))} maxLength={80} />

          <div className="grid grid-cols-2 gap-3">
            <Input id="eventDate" label="公演日" required type="date" min={today}
              value={state.eventDate} onChange={(e) => setState((s) => ({ ...s, eventDate: e.target.value }))} />
            <Input id="eventTime" label="開演時刻" type="time"
              value={state.eventTime} onChange={(e) => setState((s) => ({ ...s, eventTime: e.target.value }))} />
          </div>

          <Input id="departure" label="出発地" required placeholder="名古屋駅"
            value={state.departure} onChange={(e) => setState((s) => ({ ...s, departure: e.target.value }))} maxLength={50} />

          <Input id="budgetHint" label="予算目安（円）" type="number" placeholder="40000"
            value={state.budgetHint} onChange={(e) => setState((s) => ({ ...s, budgetHint: e.target.value }))} />
        </div>

        <Button className="mt-6 w-full" onClick={handleNext}>次へ →</Button>
      </main>
    );
  }

  // ---- Step 3: Options ----
  if (step === 3) {
    const handleGenerate = async () => {
      setError("");
      setStep(4);
      setLoadingSteps([false, false, false, false]);

      // ステップアニメーション
      const delays = [500, 2000, 4000, 6000];
      delays.forEach((d, i) => {
        setTimeout(() => setLoadingSteps((prev) => prev.map((v, j) => j <= i ? true : v)), d);
      });

      try {
        const res = await fetch("/api/plans/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artist_id: state.artistId ?? undefined,
            event_name: state.eventName,
            venue_hint: state.venueHint,
            event_date: state.eventDate,
            event_time: state.eventTime || undefined,
            departure: state.departure,
            budget_hint: state.budgetHint ? parseInt(state.budgetHint) : undefined,
            options: {
              stay_overnight: state.stayOvernight,
              merch: state.merch,
              pilgrimage: state.pilgrimage,
            },
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error?.message ?? "プランの生成に失敗しました");
          setStep(3);
          return;
        }

        setGeneratedPlan(data as Plan);
        setStep(5);
      } catch {
        setError("ネットワークエラーが発生しました");
        setStep(3);
      }
    };

    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button type="button" onClick={() => setStep(2)} className="text-gray-400 hover:text-gray-600">← 戻る</button>
          <StepDots current={3} />
        </div>
        <h1 className="mb-6 text-xl font-bold text-gray-900">オプションを選んでください</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex flex-col gap-3">
          {([
            { key: "stayOvernight", label: "宿泊する" },
            { key: "merch", label: "物販に参加する" },
            { key: "pilgrimage", label: "聖地巡礼を含める" },
          ] as const).map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-4 py-3 hover:border-purple-200">
              <span className="font-medium text-gray-800">{label}</span>
              <input type="checkbox" className="h-5 w-5 accent-purple-600"
                checked={state[key]} onChange={(e) => setState((s) => ({ ...s, [key]: e.target.checked }))} />
            </label>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-purple-50 px-4 py-3 text-center text-sm text-purple-700">
          ✨ 完全無料でプランを生成します
          {isLoggedIn ? " （1日10回まで）" : " （1日3回まで）"}
        </div>

        <Button className="mt-4 w-full" size="lg" onClick={handleGenerate}>
          ✨ 遠征プランを生成する
        </Button>
        <p className="mt-2 text-center text-xs text-gray-400">約5〜10秒かかります</p>
      </main>
    );
  }

  // ---- Step 4: Generating ----
  if (step === 4) {
    const steps = ["会場情報を取得", "交通手段を検索", "周辺ホテルを検索", "タイムラインを作成"];
    return (
      <main className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-6 text-5xl animate-bounce">🎵</div>
          <p className="mb-8 text-lg font-medium text-gray-700">AIが遠征プランを作成中...</p>
          <ul className="flex flex-col gap-3 text-left">
            {steps.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 text-sm ${loadingSteps[i] ? "text-gray-700" : "text-gray-300"}`}>
                <span>{loadingSteps[i] ? "✅" : "─"}</span>
                {s}
                {i === loadingSteps.filter(Boolean).length - 1 && loadingSteps[i] && !loadingSteps[i + 1] && (
                  <span className="ml-1 animate-pulse">...</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-gray-400">約5〜10秒お待ちください</p>
        </div>
      </main>
    );
  }

  // ---- Step 5: Result ----
  if (step === 5 && generatedPlan) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button type="button"
            onClick={() => { if (confirm("プランを破棄してやり直しますか？")) { setStep(1); setState({ ...INITIAL_STATE, departure: homeStation }); setGeneratedPlan(null); } }}
            className="text-gray-400 hover:text-gray-600"
          >
            × 破棄
          </button>
          <h1 className="text-lg font-bold text-gray-900">✨ プランが完成しました！</h1>
          <div className="w-16" />
        </div>

        <PlanResult plan={generatedPlan} />

        <div className="mt-8 flex flex-col gap-3">
          {isLoggedIn ? (
            <Button className="w-full" onClick={() => router.push(`/plans/${generatedPlan.id}`)}>
              💾 プランを保存する
            </Button>
          ) : (
            <Button className="w-full" onClick={() => router.push(`/auth/login?redirectTo=/plans`)}>
              💾 ログインして保存する
            </Button>
          )}
          <Button variant="secondary" className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(
                `${process.env.NEXT_PUBLIC_APP_URL}/shared/${generatedPlan.share_token ?? generatedPlan.id}`
              );
              alert("URLをコピーしました");
            }}
          >
            🔗 URLをコピーして共有する
          </Button>
        </div>
      </main>
    );
  }

  return null;
}

function StepDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEP_DOTS.map((n) => (
        <div
          key={n}
          className={`h-2 w-2 rounded-full transition ${n === current ? "bg-purple-600 w-4" : n < current ? "bg-purple-300" : "bg-gray-200"}`}
        />
      ))}
    </div>
  );
}
