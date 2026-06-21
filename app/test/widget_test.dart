import 'package:flutter_test/flutter_test.dart';
import 'package:private_im_app/config/app_config.dart';
import 'package:private_im_app/main.dart';
import 'package:private_im_app/services/matrix_service.dart';

void main() {
  testWidgets('shows login screen before authentication', (tester) async {
    const config = AppConfig(
      brandName: 'Private IM',
      homeserverUrl: 'http://127.0.0.1:8008',
      adminBackendUrl: 'http://127.0.0.1:4180',
      registrationEnabled: false,
      federationEnabled: false,
      e2eeDefault: true,
      maxUploadMb: 100,
    );
    await tester.pumpWidget(PrivateImApp(config: config, matrix: MatrixService(config)));
    expect(find.text('登录'), findsOneWidget);
  });
}
