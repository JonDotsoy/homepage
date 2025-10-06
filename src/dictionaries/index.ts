import es from "./es.json";
import en from "./en.json";

export const dictionary = (locale: string) => {
  if (locale === "es") {
    return es;
  }
  return en;
};
