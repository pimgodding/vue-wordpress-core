export default (anchor: string): string => anchor.replace(/href=(["'])/g, 'to=$1').replace(/<a/g, "<router-link").replace(/<\/a/g, '</router-link')