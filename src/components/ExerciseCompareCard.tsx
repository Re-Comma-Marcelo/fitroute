import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useT } from "@/lib/i18n";
import { formatDate, formatKg } from "@/lib/format";
import { e1rmSeries } from "@/lib/records";
import type { Exercise, Workout, WorkoutSet } from "@/lib/types";

interface Row {
  label: string;
  a?: number;
  b?: number;
}

/** Two lifts, one chart: overlaid estimated 1RM curves. */
export function ExerciseCompareCard({
  workouts,
  sets,
  exercises,
}: {
  workouts: Workout[];
  sets: WorkoutSet[];
  exercises: Exercise[];
}) {
  const t = useT();

  const logged = useMemo(
    () => exercises.filter((e) => sets.some((s) => s.exerciseId === e.id && s.concluida)),
    [exercises, sets],
  );

  const [first, setFirst] = useState<string>("");
  const [second, setSecond] = useState<string>("");

  const idA = first || logged[0]?.id || "";
  const idB = second || logged[1]?.id || "";

  const data = useMemo<Row[]>(() => {
    const a = e1rmSeries(idA, sets, workouts);
    const b = e1rmSeries(idB, sets, workouts);
    const dates = [...new Set([...a.map((p) => p.date), ...b.map((p) => p.date)])].sort();
    return dates.map((date) => ({
      label: formatDate(date),
      ...(a.find((p) => p.date === date) ? { a: a.find((p) => p.date === date)!.e1rm } : {}),
      ...(b.find((p) => p.date === date) ? { b: b.find((p) => p.date === date)!.e1rm } : {}),
    }));
  }, [idA, idB, sets, workouts]);

  if (logged.length < 2) return null;

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="label-caps">{t("Compare two lifts")}</h2>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">
        {t("Estimated 1RM per session, side by side.")}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Picker
          label={t("Lift A")}
          value={idA}
          options={logged}
          onChange={setFirst}
          accentClass="text-train"
        />
        <Picker
          label={t("Lift B")}
          value={idB}
          options={logged}
          onChange={setSecond}
          accentClass="text-info"
        />
      </div>

      <div className="mt-3 h-40">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <YAxis
                width={34}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(value: number) => formatKg(value)}
              />
              <Line
                type="monotone"
                dataKey="a"
                connectNulls
                className="stroke-train"
                strokeWidth={2}
                dot={{ r: 2.5, className: "fill-train stroke-train" }}
              />
              <Line
                type="monotone"
                dataKey="b"
                connectNulls
                className="stroke-info"
                strokeWidth={2}
                dot={{ r: 2.5, className: "fill-info stroke-info" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {t("Log a few sessions to see your trend here.")}
          </p>
        )}
      </div>
    </section>
  );
}

function Picker({
  label,
  value,
  options,
  onChange,
  accentClass,
}: {
  label: string;
  value: string;
  options: Exercise[];
  onChange: (id: string) => void;
  accentClass: string;
}) {
  return (
    <label className="block">
      <span className={`label-caps ${accentClass}`}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tap-target mt-1 w-full truncate rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
