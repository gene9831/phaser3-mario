type ObjectValues = {
  gravity?: number;
  v_downMax?: number;
  v_x?: number;
  v_x_die?: number;
  v_y_die?: number;
  v_trample?: number;
};

type ObjectsValues = {
  [key: string]: ObjectValues;
};

type Values = {
  gravity: number;
  v_downMax: number;
  characters: ObjectsValues;
  items: ObjectsValues;
  enemies: ObjectsValues;
};

// unit: 1/16 BLOCK
const FPS30_VALUES: Values = {
  gravity: 1,
  v_downMax: 6,
  characters: {
    mario: {
      v_trample: 8,
    },
  },
  items: {
    magicMushroom: {
      v_x: 2,
    },
  },
  enemies: {
    goomba: {
      v_x: 1,
      v_x_die: 2,
      v_y_die: 6,
    },
  },
};

const BLOCK_PIXELS = 32;
const GAME_FPS = 60;

const transformToPixelsPerS = (values: Values, fps: number) => {
  const dfs = (object: any) => {
    for (let key in object) {
      if (typeof object[key] === "number") {
        if (key.startsWith("v_")) {
          // velocity
          object[key] *= (fps * BLOCK_PIXELS) / 16;
        } else if (key.startsWith("a_") || key.startsWith("gravity")) {
          // gravity or acceleration
          object[key] *= (fps * fps * BLOCK_PIXELS) / 16;
        }
      } else {
        dfs(object[key]);
      }
    }
  };

  const newValues: Values = JSON.parse(JSON.stringify(values));
  dfs(newValues);
  return newValues;
};

const VAValues = transformToPixelsPerS(FPS30_VALUES, 30);

export { VAValues, BLOCK_PIXELS, GAME_FPS };
