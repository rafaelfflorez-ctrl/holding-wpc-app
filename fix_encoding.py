import os
import glob

def fix_encoding(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Fix common mojibake patterns (Windows-1252 interpreted as UTF-8)
        replacements = {
            'Ã©': 'é', 'Ã³': 'ó', 'Ã¡': 'á', 'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã': 'Á', 'Ã': 'Á', 'Ã': 'Á',
            'Ã³': 'ó', 'Ã©': 'é', 'Ã±': 'ñ', 'Ãº': 'ú', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã': 'Á', 'Ã': 'Á', 'Ã': 'Á',
        }
        
        # More specific replacements for common words
        specific_replacements = {
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'autenticar': 'autenticar',
            'autenticaciÃ³n': 'autenticación',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'autenticar': 'autenticar',
            'autenticaciÃ³n': 'autenticación',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
        }
        
        # Read file
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Apply specific replacements first
        for wrong, correct in {
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'autenticar': 'autenticar',
            'autenticaciÃ³n': 'autenticación',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
        }.items():
            content = content.replace(wrong, correct)
        
        # Apply general replacements
        for wrong, correct in replacements.items():
            content = content.replace(wrong, correct)
        
        # Specific replacements for common words
        specific_replacements = {
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'autenticar': 'autenticar',
            'autenticaciÃ³n': 'autenticación',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
        }.items():
            content = content.replace(wrong, correct)
        
        # Apply general replacements
        general_replacements = {
            'Ã©': 'é', 'Ã³': 'ó', 'Ã¡': 'á', 'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã': 'Á', 'Ã': 'Á', 'Ã': 'Á',
            'Ã³': 'ó', 'Ã©': 'é', 'Ã±': 'ñ', 'Ãº': 'ú', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã±': 'ñ', 'Ãº': 'ú', 'Ã­': 'í', 'Ã¡': 'á', 'Ã³': 'ó', 'Ã©': 'é',
            'Ã': 'Á', 'Ã': 'Á', 'Ã': 'Á',
        }
        
        # Specific replacements for common words
        specific_replacements = {
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'autenticar': 'autenticar',
            'autenticaciÃ³n': 'autenticación',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'autenticar': 'autenticar',
            'autenticaciÃ³n': 'autenticación',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
        }
        
        # Read file
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Apply specific replacements first
        for wrong, correct in {
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'autenticar': 'autenticar',
            'autenticaciÃ³n': 'autenticación',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
            'diseÃ±o': 'diseño',
            'seÃ±or': 'señor',
            'seÃ±or': 'señor',
            'diseÃ±o': 'diseño',
            'autenticaciÃ³n': 'autenticación',
            'configuraciÃ³n': 'configuración',
        }.items():
            content = content.replace(wrong, correct)
        
        # Apply general replacements
        for wrong, correct in replacements.items():
            content = content.replace(wrong, correct)
        
        # Apply specific replacements
        for wrong, correct in specific_replacements.items():
            content = content.replace(wrong, correct)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
    except Exception as e:
        print(f'Error processing {filepath}: {e}')
        return False
    return False

# Process all .tsx and .ts files in src
import glob
for filepath in glob.glob('src/**/*.tsx', recursive=True):
    fix_encoding(filepath)

for filepath in glob.glob('src/**/*.ts', recursive=True):
    fix_encoding(filepath)

# Fix server.ts
fix_encoding('server.ts')

print('Done fixing encoding issues')