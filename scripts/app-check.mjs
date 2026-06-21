import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('.');

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function fail(message) {
  throw new Error(message);
}

function pass(message) {
  console.log(`ok - ${message}`);
}

const requiredFiles = [
  'app/pubspec.yaml',
  'app/analysis_options.yaml',
  'app/assets/app_config.json',
  'app/lib/main.dart',
  'app/lib/config/app_config.dart',
  'app/lib/services/app_backend_service.dart',
  'app/lib/services/matrix_service.dart',
  'app/lib/screens/app_shell.dart',
  'app/lib/screens/login_screen.dart',
  'app/lib/screens/register_screen.dart',
  'app/lib/screens/home_screen.dart',
  'app/lib/screens/chat_screen.dart',
  'app/lib/screens/files_screen.dart',
  'app/lib/screens/devices_screen.dart',
  'app/lib/screens/room_info_screen.dart',
  'app/lib/screens/settings_screen.dart',
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) fail(`missing ${file}`);
}
pass('flutter app files exist');

const pubspec = read('app/pubspec.yaml');
for (const dependency of ['matrix:', 'flutter_secure_storage:', 'http:', 'flutter_lints:']) {
  if (!pubspec.includes(dependency)) fail(`pubspec missing ${dependency}`);
}
pass('flutter dependencies declared');

const config = JSON.parse(read('app/assets/app_config.json'));
for (const key of ['brandName', 'homeserverUrl', 'adminBackendUrl', 'registrationEnabled', 'e2eeDefault']) {
  if (!(key in config)) fail(`app_config missing ${key}`);
}
pass('app config is valid json');

const matrixService = read('app/lib/services/matrix_service.dart');
for (const snippet of ['Client(', 'checkHomeserver', 'login(', 'FlutterSecureStorage', 'sendTextEvent']) {
  if (!matrixService.includes(snippet)) fail(`matrix service missing ${snippet}`);
}
pass('matrix service covers login/session/send');

const backendService = read('app/lib/services/app_backend_service.dart');
for (const snippet of ['/api/app/register', 'inviteCode', 'http.post']) {
  if (!backendService.includes(snippet)) fail(`backend service missing ${snippet}`);
}
pass('backend service covers invite registration');

const home = read('app/lib/screens/home_screen.dart');
if (!home.includes('NavigationBar') || !home.includes('ChatScreen') || !home.includes('FilesScreen') || !home.includes('SettingsScreen')) {
  fail('home screen missing navigation targets');
}
pass('home screen navigation present');

const chat = read('app/lib/screens/chat_screen.dart');
if (!chat.includes('RoomInfoScreen')) fail('chat screen missing room info entry');
pass('chat room info entry present');

console.log('app check passed');
