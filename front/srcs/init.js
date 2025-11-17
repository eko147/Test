//@ts-nocheck
import CONFIG, { viewConstructors } from  "@/views/config";
import View from "@/lib/view";

// CONFIG file path
export default function init() {
  View.DEFAULT_DIR = CONFIG["default_dir"];
  for (const dir in CONFIG.filePath) {
    for (let view of CONFIG.filePath[dir]) {
      const viewClass = viewConstructors[view.className];
      const viewName = view.fileName.replaceAll('_', '-');
      viewClass.register({
        viewName,
        fileName: view.fileName,
        dirName: View.DEFAULT_DIR + dir + "/"
      });
    }
  }
}
