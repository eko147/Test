import Observable from "@/lib/observable";

/**
 * binding observable data with html element
 * @param {Observable} data
 * @param {HTMLElement} obj
 * @params {{
 * path: string,
 * eventKey: string | null
 * }}
 */
export default function binding(data, obj, {
  path = "value",
  eventKey = null
}) {
  const id = data.subscribe(value => obj[path] = value);
  const observer = new MutationObserver(
    () => data.unSubscribe(id));  
  observer.observe(document.getElementById("app"), 
    { childList: true });
  if (eventKey) {
  obj.addEventListener(eventKey, 
    () => data.value = obj[path]);
  }
}
