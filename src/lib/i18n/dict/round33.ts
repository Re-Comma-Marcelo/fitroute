import type { DictFragment } from "../types";

/** Session journey fix: no silent exercise skips, honest finish dialog. */
export const dict: DictFragment = {
  pt: {
    "{count} exercises still have sets to do": "{count} exercícios ainda têm séries a fazer",
    "{count} completed sets will be saved. The rest stays undone.":
      "{count} séries concluídas serão salvas. O resto fica como não feito.",
  },
  nl: {
    "{count} exercises still have sets to do": "{count} oefeningen hebben nog sets openstaan",
    "{count} completed sets will be saved. The rest stays undone.":
      "{count} voltooide sets worden opgeslagen. De rest blijft onafgerond.",
  },
};
