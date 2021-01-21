import { GoombaFactory } from "~/objects/enemies";
import { MagicMushroomFactory } from "~/objects/items";
import { ObjectConfig } from "./Types";

const objectConfigs: {
  [key: string]: ObjectConfig;
} = {
  magicMushroom: {
    Factory: MagicMushroomFactory,
  },
  goomba: {
    Factory: GoombaFactory,
    repeat: -1,
  },
};

export { objectConfigs };
