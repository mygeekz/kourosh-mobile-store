declare module "node-fetch" {
  const fetch: (...args: any[]) => Promise<any>;
  export default fetch;
}
