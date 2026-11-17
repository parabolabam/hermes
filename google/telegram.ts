export function privateTelegram(token: string | undefined, users: string | undefined, chat: string | undefined): boolean {
 if (!token || !/^[1-9]\d*:[A-Za-z0-9_-]+$/.test(token) || !users || !chat || !/^[1-9]\d*$/.test(chat)) return false;
 const ids=users.split(',');
 return ids.every(id=>/^[1-9]\d*$/.test(id)) && new Set(ids).size===ids.length && ids.includes(chat);
}
