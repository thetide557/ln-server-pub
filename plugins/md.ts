/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { createFilter } from '@rollup/pluginutils';

// 提到模块级复用，避免对每个模块 transform 时都新建一次 filter（大项目下可省大量分配）
const mdFilter = createFilter(/\.md$/);

export function md() {
  return {
    name: 'react-markdown',
    resolveId(source, importer) {
      if (!importer) {
        if (/\.md$/.test(source)) {
          // console.log(source);
        }
      }
    },
    load(id) {
      if (mdFilter(id)) {
        // console.log(id, 'filter');
      }
    },
    transform(code, id, ssr) {
      if (mdFilter(id)) {
        return {
          code: `export default ${JSON.stringify(code)}`,
          map: null,
        };
      }
    },
  };
}
