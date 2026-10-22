import type { RuinaPrivateInfo, RuinaState } from "@shared/index";
import type { RuinaSelf } from "../hooks/useRuinaSocket";
import { ContractFolder } from "./ContractFolder";
import { JuntaHeader } from "./JuntaHeader";
import { NeighborBoard } from "./NeighborBoard";
import { PlayerCredential } from "./PlayerCredential";

interface PlayerDashboardProps {
  room: RuinaState;
  you: RuinaSelf;
  privateInfo: RuinaPrivateInfo;
  supabaseRealtime: { configured: boolean; connected: boolean };
}

export function PlayerDashboard({
  room,
  you,
  privateInfo,
  supabaseRealtime,
}: PlayerDashboardProps) {
  return (
    <div className="space-y-4">
      <JuntaHeader room={room} supabaseRealtime={supabaseRealtime} />

      <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <PlayerCredential room={room} you={you} privateInfo={privateInfo} />
        <ContractFolder room={room} />
      </div>

      <NeighborBoard room={room} you={you} />
    </div>
  );
}
