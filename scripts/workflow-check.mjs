import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const workflow = readFileSync('.github/workflows/android-apk.yml', 'utf8');

assert(workflow.includes('android-actions/setup-android'), 'Android SDK setup action missing');
assert(workflow.includes('subosito/flutter-action'), 'Flutter setup action missing');
assert(workflow.includes('platforms;android-36'), 'Android SDK 36 install missing');
assert(workflow.includes('compileSdk = 36'), 'compileSdk 36 patch missing');
assert(workflow.includes('flutter analyze'), 'Flutter analyze step missing');
assert(workflow.includes('flutter build apk --release'), 'Release APK build step missing');
assert(workflow.includes('actions/upload-artifact'), 'APK artifact upload missing');

console.log('workflow check passed');
