/**
 * Recharts bundle — isolated so /monitor can lazy-load it.
 */
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tipStyle = {
  background: "hsl(var(--surface))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export function FpsChart({
  data,
}: {
  data: { i: number; fps: number; t: string }[];
}) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-muted">
        Collecting frames… navigate the mesh to warm the probe.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 10 }}
          stroke="hsl(var(--muted))"
        />
        <YAxis
          domain={[0, 70]}
          tick={{ fontSize: 10 }}
          stroke="hsl(var(--muted))"
        />
        <Tooltip contentStyle={tipStyle} />
        <Area
          type="monotone"
          dataKey="fps"
          stroke="hsl(var(--info))"
          fill="hsl(var(--info) / 0.2)"
          strokeWidth={2}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RouteTimingChart({
  data,
}: {
  data: { i: number; ms: number; path: string }[];
}) {
  if (data.length < 1) {
    return (
      <p className="text-sm text-muted">
        Visit Shop, Labs, Mirror… each hop records a sample.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis
          dataKey="path"
          tick={{ fontSize: 10 }}
          stroke="hsl(var(--muted))"
        />
        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted))" />
        <Tooltip contentStyle={tipStyle} />
        <Area
          type="monotone"
          dataKey="ms"
          stroke="hsl(var(--warning))"
          fill="hsl(var(--warning) / 0.18)"
          strokeWidth={2}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
