import { handleContact } from '../../lib/contact.js';
export const onRequest = ({ request, env }) => handleContact(request, env);
