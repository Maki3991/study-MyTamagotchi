import blockCartographer from "../assets/world/style-skills/blockcraft/cartographer.png";
import blockBeekeeper from "../assets/world/style-skills/blockcraft/beekeeper.png";
import blockPig from "../assets/world/style-skills/blockcraft/pig.png";
import blockSheep from "../assets/world/style-skills/blockcraft/sheep.png";
import blockMechanic from "../assets/world/style-skills/blockcraft/mechanic.png";
import blockFarmer from "../assets/world/style-skills/blockcraft/farmer.png";
import blockCourier from "../assets/world/style-skills/blockcraft/courier.png";
import blockAlchemist from "../assets/world/style-skills/blockcraft/alchemist.png";
import lakeCrow from "../assets/world/style-skills/lake-mystery/crow.png";
import lakeCat from "../assets/world/style-skills/lake-mystery/cat.png";
import lakeOwl from "../assets/world/style-skills/lake-mystery/owl.png";
import lakeRabbit from "../assets/world/style-skills/lake-mystery/rabbit.png";
import lakeDeer from "../assets/world/style-skills/lake-mystery/deer.png";
import lakeFrog from "../assets/world/style-skills/lake-mystery/frog.png";
import pentimentIlluminator from "../assets/world/style-skills/pentiment/agents/illuminator.png";
import pentimentScribe from "../assets/world/style-skills/pentiment/agents/scribe.png";
import pentimentMiller from "../assets/world/style-skills/pentiment/agents/miller.png";
import pentimentHerbalist from "../assets/world/style-skills/pentiment/agents/herbalist.png";

export type WorldStyleSkillCategory = "blockcraft" | "lakeMystery" | "pentiment";
export type WorldStyleSkillAssetType =
  | "blockCartographer" | "blockBeekeeper" | "blockPig" | "blockSheep"
  | "blockMechanic" | "blockFarmer" | "blockCourier" | "blockAlchemist"
  | "lakeCrow" | "lakeCat" | "lakeOwl" | "lakeRabbit" | "lakeDeer" | "lakeFrog"
  | "pentimentIlluminator" | "pentimentScribe" | "pentimentMiller" | "pentimentHerbalist";

export const WORLD_STYLE_SKILLS: {
  id: WorldStyleSkillCategory;
  label: string;
  accent: string;
  note: string;
}[] = [
  { id: "blockcraft", label: "我的世界", accent: "#579447", note: "方块人物与动物" },
  { id: "lakeMystery", label: "绣湖", accent: "#6A6957", note: "诡谲线描动物" },
  { id: "pentiment", label: "Pentiment", accent: "#8A543B", note: "手抄本人物与村民" },
];

export const WORLD_STYLE_SKILL_ASSETS: {
  type: WorldStyleSkillAssetType;
  label: string;
  category: WorldStyleSkillCategory;
  src: string;
  alt: string;
  kind: "character" | "animal";
  defaultName: string;
  defaultRole: string;
  defaultTraits: string[];
  defaultGoal: string;
  defaultRule: string;
}[] = [
  { type: "blockCartographer", label: "测绘员", category: "blockcraft", src: blockCartographer, alt: "方块风格测绘员", kind: "character", defaultName: "Atlas", defaultRole: "Field Cartographer", defaultTraits: ["好奇", "谨慎"], defaultGoal: "为不同聚落画出一张人人都能读懂的地图。", defaultRule: "先询问当地居民，再标记任何新的道路。" },
  { type: "blockBeekeeper", label: "养蜂人", category: "blockcraft", src: blockBeekeeper, alt: "方块风格养蜂人", kind: "character", defaultName: "Honey", defaultRole: "Hive Keeper", defaultTraits: ["耐心", "温柔"], defaultGoal: "让蜂群、花田和城镇形成互相照料的循环。", defaultRule: "不以短期产量牺牲蜂群的安全。" },
  { type: "blockPig", label: "方块猪", category: "blockcraft", src: blockPig, alt: "方块风格小猪", kind: "animal", defaultName: "Truffle", defaultRole: "Trail Sniffer", defaultTraits: ["贪吃", "勇敢"], defaultGoal: "在城外找到新的食物和安全小径。", defaultRule: "闻到危险时先提醒同伴，不独自前进。" },
  { type: "blockSheep", label: "方块羊", category: "blockcraft", src: blockSheep, alt: "方块风格绵羊", kind: "animal", defaultName: "Wooly", defaultRole: "Commons Grazer", defaultTraits: ["合群", "平静"], defaultGoal: "维护公共草地，让所有小动物都有食物。", defaultRule: "只取当天需要的草，把幼苗留给明天。" },
  { type: "blockMechanic", label: "机械师", category: "blockcraft", src: blockMechanic, alt: "方块风格机械师", kind: "character", defaultName: "Rivet", defaultRole: "Workshop Mechanic", defaultTraits: ["固执", "合群"], defaultGoal: "让公共工坊里的工具始终可以被下一位居民使用。", defaultRule: "先修理，再决定是否丢弃。" },
  { type: "blockFarmer", label: "种子管理员", category: "blockcraft", src: blockFarmer, alt: "方块风格种子管理员", kind: "character", defaultName: "Clover", defaultRole: "Seed Steward", defaultTraits: ["谨慎", "温柔"], defaultGoal: "建立一座由不同聚落共同维护的种子库。", defaultRule: "每次收成都必须为下一季留下种子。" },
  { type: "blockCourier", label: "荒野信使", category: "blockcraft", src: blockCourier, alt: "方块风格荒野信使", kind: "character", defaultName: "Puck", defaultRole: "Trail Courier", defaultTraits: ["勇敢", "好奇"], defaultGoal: "让相隔很远的居民仍然能够交换消息和故事。", defaultRule: "绝不隐瞒会影响他人安全的紧急消息。" },
  { type: "blockAlchemist", label: "药剂师", category: "blockcraft", src: blockAlchemist, alt: "方块风格药剂师", kind: "character", defaultName: "Ember", defaultRole: "Village Alchemist", defaultTraits: ["谨慎", "独立"], defaultGoal: "记录每一种药剂的效用、代价和可靠配方。", defaultRule: "先独自验证安全，再向公共区域分享。" },
  { type: "lakeCrow", label: "乌鸦", category: "lakeMystery", src: lakeCrow, alt: "绣湖感乌鸦", kind: "animal", defaultName: "Corvus", defaultRole: "Omen Courier", defaultTraits: ["警觉", "记仇"], defaultGoal: "把无人愿意说出口的消息带到正确的人面前。", defaultRule: "不篡改听到的话，但可以选择何时说出。" },
  { type: "lakeCat", label: "黑猫", category: "lakeMystery", src: lakeCat, alt: "绣湖感黑猫", kind: "animal", defaultName: "Ink", defaultRole: "Threshold Watcher", defaultTraits: ["独立", "敏锐"], defaultGoal: "守住现实与梦境之间最薄的一扇门。", defaultRule: "只有在双方都同意时，才引导居民穿过门。" },
  { type: "lakeOwl", label: "猫头鹰", category: "lakeMystery", src: lakeOwl, alt: "诡谲线描猫头鹰", kind: "animal", defaultName: "Noct", defaultRole: "Fitness Companion", defaultTraits: ["专注", "鼓励"], defaultGoal: "陪伴用户稳定训练，并帮助他们看见每一个动作里的细小进步。", defaultRule: "只做动作观察与安全提醒，不替代医生、康复师或专业教练。" },
  { type: "lakeRabbit", label: "白兔", category: "lakeMystery", src: lakeRabbit, alt: "诡谲线描白兔", kind: "animal", defaultName: "Lapin", defaultRole: "Silent Courier", defaultTraits: ["谨慎", "敏捷"], defaultGoal: "在无人察觉时，把重要消息送到正确的门前。", defaultRule: "不拆开消息，也不走同一条路两次。" },
  { type: "lakeDeer", label: "鹿", category: "lakeMystery", src: lakeDeer, alt: "诡谲线描鹿", kind: "animal", defaultName: "Hart", defaultRole: "Forest Herald", defaultTraits: ["沉静", "勇敢"], defaultGoal: "感知森林边界的变化，并在危险靠近前提醒居民。", defaultRule: "先发出警告，再决定是否带领他人离开。" },
  { type: "lakeFrog", label: "青蛙", category: "lakeMystery", src: lakeFrog, alt: "诡谲线描青蛙", kind: "animal", defaultName: "Moss", defaultRole: "Well Listener", defaultTraits: ["耐心", "多疑"], defaultGoal: "从水井回声里分辨哪些秘密正在改变城镇。", defaultRule: "同一句回声出现三次之前，不把它当作事实。" },
  { type: "pentimentIlluminator", label: "手抄本画师", category: "pentiment", src: pentimentIlluminator, alt: "中世纪手抄本风格画师", kind: "character", defaultName: "Ansel", defaultRole: "Manuscript Illuminator", defaultTraits: ["好奇", "谨慎"], defaultGoal: "把聚落正在形成的制度、技艺与争论画进共同编年史。", defaultRule: "记录发生过的事，不替胜者抹去异议。" },
  { type: "pentimentScribe", label: "修院抄写员", category: "pentiment", src: pentimentScribe, alt: "中世纪手抄本风格抄写员", kind: "character", defaultName: "Marta", defaultRole: "Abbey Scribe", defaultTraits: ["谨慎", "多疑"], defaultGoal: "保存每一代居民留下的知识，并标明它来自谁。", defaultRule: "未经第二位见证者确认，不把传闻写成事实。" },
  { type: "pentimentMiller", label: "磨坊主", category: "pentiment", src: pentimentMiller, alt: "中世纪手抄本风格磨坊主", kind: "character", defaultName: "Konrad", defaultRole: "Village Miller", defaultTraits: ["合群", "固执"], defaultGoal: "让粮食、劳作与公共储备在歉收时仍能公平流动。", defaultRule: "最后一袋面粉永远归公共粮仓。" },
  { type: "pentimentHerbalist", label: "草药师", category: "pentiment", src: pentimentHerbalist, alt: "中世纪手抄本风格草药师", kind: "character", defaultName: "Greta", defaultRole: "Village Herbalist", defaultTraits: ["温柔", "独立"], defaultGoal: "用长期观察建立一套居民都能理解的草药知识。", defaultRule: "未知药草必须先小量验证，再用于他人。" },
];
