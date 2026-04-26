import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// Colors derived from the web frontend's CSS variables (dark mode)
// --background:  hsl(240 10% 4%)   ≈ #090910
// --card:        hsl(240 10% 6%)   ≈ #0D0D18
// --primary:     hsl(142 76% 45%)  ≈ #1AC95A  (green)
// --secondary:   hsl(240 6%  12%)  ≈ #1C1C28
// --border:      hsl(240 5%  18%)  ≈ #2B2B38
// --foreground:  hsl(0   0%  98%)  ≈ #FAFAFA

class AppTheme {
  static const _primary   = Color(0xFF1AC95A); // hsl(142,76%,45%) — green
  static const _bg        = Color(0xFF090910); // hsl(240,10%,4%)
  static const _surface   = Color(0xFF0D0D18); // hsl(240,10%,6%)
  static const _secondary = Color(0xFF1C1C28); // hsl(240,6%,12%)
  static const _border    = Color(0xFF2B2B38); // hsl(240,5%,18%)
  static const _fg        = Color(0xFFFAFAFA);

  static ThemeData dark() {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: _bg,
      colorScheme: const ColorScheme.dark(
        primary: _primary,
        onPrimary: _bg,
        surface: _surface,
        onSurface: _fg,
        outline: _border,
        secondary: _secondary,
        onSecondary: _fg,
      ),
      cardTheme: CardThemeData(
        color: _surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: _border),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: _bg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: _fg,
        ),
        iconTheme: const IconThemeData(color: _fg),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: _surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: _primary.withValues(alpha: 0.15),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: selected ? _primary : _fg.withValues(alpha: 0.5),
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(color: selected ? _primary : _fg.withValues(alpha: 0.5), size: 22);
        }),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _secondary,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: _border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: _border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: _primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        hintStyle: TextStyle(color: _fg.withValues(alpha: 0.35)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _primary,
          foregroundColor: _bg,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: _primary),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: _secondary,
        side: const BorderSide(color: _border),
        labelStyle: GoogleFonts.inter(fontSize: 12, color: _fg.withValues(alpha: 0.8)),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      ),
      dividerTheme: const DividerThemeData(color: _border, thickness: 1),
      popupMenuTheme: PopupMenuThemeData(
        color: _secondary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: const BorderSide(color: _border),
        ),
      ),
      textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(
        bodyColor: _fg,
        displayColor: _fg,
      ),
    );
  }
}
