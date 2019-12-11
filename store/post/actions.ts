import { VuexModulePost, WordpressOption } from './../../types/index';
import { ModulePrefix } from './../../index';
import axios from "axios";

import * as types from "./mutation-types";
import { ActionTree } from "vuex";

const currentlyFetching = {}

export const actions: ActionTree<VuexModulePost, any> = {
  async load({ commit, rootState, state }, {
    slug,
    type = 'pages',
    embed = false,
    fields = [],
    beforeSave = null,
    beforeRequest = null,
    beforeSaveFailed = null
  }: WordpressOption) {
    const config = rootState[`${ModulePrefix}_config`];

    let typeBaseUrl = `/wp-json/wp/v2/${type}`;

    if (
      config.requestPrefix &&
      config.requestPrefix.length > 0
    ) {
      let prefix = config.requestPrefix;
      if (prefix.endsWith("/")) {
        prefix = prefix.substring(0, -1);
      }
      if (prefix.startsWith("/")) {
        prefix = prefix.substr(1);
      }
      typeBaseUrl = `/${prefix}${typeBaseUrl}`;
    }

    const embedString = embed ? "_embed" : "";

    const halfBase = config.url.endsWith("/")
      ? config.url.substr(0, config.url.length - 1) + typeBaseUrl
      : config.url + typeBaseUrl;

    let base =
      slug === ""
        ? `${halfBase}${embedString ? "?" + embedString : embedString}`
        : `${halfBase}?slug=${slug}${
            embedString ? "&" + embedString : embedString
          }`;

    if (!!fields && !!fields.length) {
      for (let field of (Array.isArray(fields) ? fields : [fields])) {
        base += `&_fields[]=${field}`
      }
    }
    if (!!fields.length && !fields.includes('slug')) {
      base += '&_fields[]=slug'
    }

    try {

      if (!state.types[type] || !state.types[type][slug]) {
        
        if (currentlyFetching && !currentlyFetching[type]) {
          currentlyFetching[type] = []
        }

        if (currentlyFetching && currentlyFetching[type] && currentlyFetching[type][slug]) {
          if (config.debugger) {
            const requestUrl = beforeRequest ? await beforeRequest(base) : base
            console.log(`[VueWordpress][Debugger] Omits ${requestUrl} because it is being fetched currently`)
          }
          return;
        }
        
        const requestUrl = beforeRequest ? await beforeRequest(base) : base
        const response = await axios.get(requestUrl);

        if (!currentlyFetching[type].includes(slug)) {
          currentlyFetching[type].push(slug)
        }

        if (config.debugger) {
          console.log(`[VueWordpress][Debugger] I've just fetched ${base}`)
        }

        if (response.data.status == 404) {
          throw new Error(`[VueWordpress] Error 404 in ${base} endpoint`);
        }

        if (response.data.length < 1) {
          throw new Error(`[VueWordpress] Empty data in ${base} endpoint`);
        }

        currentlyFetching[type] = currentlyFetching[type].filter(currentSlug => currentSlug !== slug)

        const data = beforeSave ? await beforeSave(response.data) : response.data
        if (config.debugger && data.some(page => !page.slug)) {
          console.log(`[VueWordpress][Debugger] Some fetched page does not have slug inside. It will cause problem with saving`)
        }

        commit(types.SET_POST_CONTENT, {
          data,
          slotName: slug,
          type
        });

      } else if (config.debugger) {
        console.log(`[VueWordpress][Debugger] Did not fetch ${base} because it is yet in the store`)
      }

    } catch (err) {

      currentlyFetching[type] = currentlyFetching[type].filter(currentSlug => currentSlug !== slug)

      if (config.debugger) {
        console.log(`[VueWordpress][Debugger] Could not fetch because of error`, err)
      }

      const data = beforeSaveFailed ? await beforeSaveFailed() : false

      commit(types.SET_POST_CONTENT, {
        data,
        slotName: slug,
        type
      });
    }
  }
};
