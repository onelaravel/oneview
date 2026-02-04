"""
Command line interface cho Blade Compiler
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main_compiler import BladeCompiler

def main():
    if len(sys.argv) < 3:
        print("Sử dụng: python cli.py <input.blade> <output.js> [function_name] [view_path] [factory_function_name]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    function_name = sys.argv[3] if len(sys.argv) > 3 else 'Test'
    view_path = sys.argv[4] if len(sys.argv) > 4 else 'test'
    factory_function_name = sys.argv[5] if len(sys.argv) > 5 else function_name
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            blade_code = f.read()
        
        compiler = BladeCompiler()
        js_code = compiler.compile_blade_to_js(blade_code, view_path, function_name, factory_function_name)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(js_code)
        
        print(f"Đã compile thành công từ {input_file} sang {output_file}")
    except Exception as e:
        print(f"Lỗi: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
