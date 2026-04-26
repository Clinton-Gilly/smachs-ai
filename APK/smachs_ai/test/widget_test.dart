import 'package:flutter_test/flutter_test.dart';
import 'package:smachs_ai/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const SmachsApp());
    expect(find.byType(AppShell), findsOneWidget);
  });
}
