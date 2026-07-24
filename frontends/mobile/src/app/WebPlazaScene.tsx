import {
  ConcentricPlazaMap,
  type ConcentricPlazaMember,
  type FeaturedPlazaHouse,
  type PlazaUserHouse,
} from "./ConcentricPlazaMap";
import type { PlazaSkill } from "./plazaSkills";

export type WebPlazaMember = ConcentricPlazaMember;

type WebPlazaSceneProps = {
  members: WebPlazaMember[];
  skills: PlazaSkill[];
  onOpenAgent: (agentId: string) => void;
  onOpenSkill: (skillId: string) => void;
  featuredHouses?: FeaturedPlazaHouse[];
  userHouse?: PlazaUserHouse | null;
  selectingHouse?: boolean;
  onSelectHouse?: (houseId: string) => void;
  onOpenUserWorld?: () => void;
  focusMemberId?: string | null;
  focusRequest?: number;
};

export function WebPlazaScene(props: WebPlazaSceneProps) {
  return <ConcentricPlazaMap {...props} />;
}
