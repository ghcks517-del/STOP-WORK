const modules = import.meta.glob('./does-not-exist.json', { eager: true });
console.log(modules);
