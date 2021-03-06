import { ModulePrefix } from './../../index';
import axios from "axios";
import Vue from "vue";

import * as types from "./mutation-types";
import { ActionTree } from "vuex";

import { UrlCreator } from "../../util/UrlCreator";

let typeBaseUrl = "/wp-json/menus/v1/menus";

export const actions: ActionTree<Object, any> = {
  async load({ rootState, commit, state }, { menuSlugs }) {
    if (menuSlugs === false) {
      return;
    }

    const config = rootState[`${ModulePrefix}_config`];

    if (config.requestPrefix) {
      let prefix = config.requestPrefix;
      if (prefix.endsWith("/")) {
        prefix = prefix.substring(0, -1);
      }
      if (prefix.startsWith("/")) {
        prefix = prefix.substr(1);
      }
      typeBaseUrl = `/${prefix}${typeBaseUrl}`;
    }

    const base = new UrlCreator(config.url, [typeBaseUrl]);

    const fixUrls = itemsBefore => {
      const fixedItems = [];

      // If itemsBefore is Object, we have to convert it to array
      const items = Array.isArray(itemsBefore)
        ? itemsBefore
        : Object.values(itemsBefore);

      for (let item of items) {
        const prefix = item.object == "page" ? "page" : "post";

        fixedItems.push({
          ...item,
          url: item.url.replace(config.url, k => {
            return config.url.substr(-1) === "/" ? `/${prefix}/` : `${prefix}/`;
          })
        });
      }

      return fixedItems;
    };

    try {
      if (Array.isArray(menuSlugs)) {
        // Few menus in paralel
        const requests = [];
        for (let slug of menuSlugs) {
          const hasMenu = (<any>state).menu[slug]
          if (hasMenu) {
            if (config.debugger) {
              console.log(`[VueWordpress][Debugger] Omits ${slug} menu because it has been fetched yet`)
            }
            continue;
          }
          base.addAtTheEnd(slug);
          requests.push(axios.get(base.url));
          base.removeFromTheEnd();
        }
        let response = await Promise.all(requests);
        response.forEach(c => {
          commit(types.SET_MENU_CONTENT, {
            data: {
              ...c.data,
              items: fixUrls(c.data.items)
            },
            slotName: c.data.slug
          });
        });
      } else if (typeof menuSlugs === "string") {
        const hasMenu = (<any>state).menu[menuSlugs]
        if (hasMenu) {
          if (config.debugger) {
            console.log(`[VueWordpress][Debugger] Omits ${menuSlugs} menu because it has been fetched yet`)
          }
          return;
        }
        base.addAtTheEnd(menuSlugs);
        let response = await axios.get(base.url);
        commit(types.SET_MENU_CONTENT, {
          data: {
            ...response.data,
            items: fixUrls(response.data.items)
          },
          slotName: menuSlugs
        });
      } else {
        if (menuSlugs === true) {
          let firstResponse = await axios.get(base.url);
          const slugs = firstResponse.data.map(v => v.slug);

          const requests = [];
          for (let slug of slugs) {
            const hasMenu = (<any>state).menu[slug]
            if (hasMenu) {
              if (config.debugger) {
                console.log(`[VueWordpress][Debugger] Omits ${slug} menu because it has been fetched yet`)
              }
              continue;
            }
            base.addAtTheEnd(slug);
            requests.push(axios.get(base.url));
            base.removeFromTheEnd();
          }
          let response = await Promise.all(requests);
          response.forEach(c => {
            commit(types.SET_MENU_CONTENT, {
              data: {
                ...c.data,
                items: fixUrls(c.data.items)
              },
              slotName: c.data.slug
            });
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
};
