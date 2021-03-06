import {
  FetchHookTypes,
  LoaderRequestElement,
  MetaConfig
} from "../../../types";
import Meta from "../../meta";
import pickMetaSource from "../../PickMetaSource";
import buildComputed from "../builders/Computed";
import buildAsyncData from "../builders/AsyncData";

export default function(
  loaderRequest:
    | string
    | LoaderRequestElement
    | Array<LoaderRequestElement | string>,
  setMeta: boolean | MetaConfig
) {
  const returnable: any = {
    asyncData: buildAsyncData(loaderRequest, FetchHookTypes.VoidAsyncData),
    computed: buildComputed(loaderRequest)
  };
  if (setMeta) {
    const { type, slug } = pickMetaSource(loaderRequest);
    returnable.mixins = [
      Meta(type, slug, typeof setMeta === "boolean" ? undefined : setMeta)
    ];
  }

  return returnable;
}
