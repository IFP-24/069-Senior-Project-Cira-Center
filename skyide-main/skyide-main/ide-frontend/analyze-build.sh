#!/bin/bash

# Build Analysis Script for SkyIDE Frontend
echo "🔍 Analyzing SkyIDE Frontend Build Size..."
echo "================================================="

# Navigate to frontend directory
cd "$(dirname "$0")"

# Run the build
echo "📦 Building production bundle..."
npm run build

echo ""
echo "📊 BUILD SIZE ANALYSIS"
echo "================================================="

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

# Get total build size
TOTAL_SIZE=$(du -sh dist | cut -f1)
echo "📁 Total Build Size: $TOTAL_SIZE"

echo ""
echo "📄 Individual File Sizes:"
echo "-------------------------"

# List all assets with sizes
find dist -name "*.js" -o -name "*.css" -o -name "*.html" | while read file; do
    size=$(du -h "$file" | cut -f1)
    filename=$(basename "$file")
    echo "  $size - $filename"
done

echo ""
echo "🏆 LARGEST FILES (Top 10):"
echo "-------------------------"
find dist -type f \( -name "*.js" -o -name "*.css" \) -exec du -h {} + | sort -hr | head -10

echo ""
echo "📈 RECOMMENDATIONS:"
echo "================================================="

# Check for large JavaScript files (>500KB)
large_js=$(find dist -name "*.js" -size +500k)
if [ ! -z "$large_js" ]; then
    echo "⚠️  LARGE JAVASCRIPT BUNDLES DETECTED:"
    echo "$large_js" | while read file; do
        size=$(du -h "$file" | cut -f1)
        echo "   - $(basename "$file"): $size"
    done
    echo ""
    echo "💡 Consider:"
    echo "   • Code splitting with dynamic imports"
    echo "   • Lazy loading components"
    echo "   • Tree shaking optimization"
    echo "   • Removing unused dependencies"
fi

# Check total size recommendations
total_mb=$(du -sm dist | cut -f1)
if [ $total_mb -gt 5 ]; then
    echo "⚠️  BUILD SIZE WARNING: ${total_mb}MB is larger than recommended 5MB"
    echo ""
    echo "💡 Optimization strategies:"
    echo "   • Enable gzip compression on your server"
    echo "   • Implement progressive web app (PWA) caching"
    echo "   • Consider code splitting for routes"
    echo "   • Optimize images and assets"
elif [ $total_mb -gt 2 ]; then
    echo "⚡ GOOD: ${total_mb}MB is acceptable but could be optimized"
    echo "💡 Consider lazy loading for better initial load times"
else
    echo "✅ EXCELLENT: ${total_mb}MB is well optimized!"
fi

echo ""
echo "🔍 DEPENDENCY ANALYSIS:"
echo "================================================="

# Check for common large dependencies
if grep -q "blockly" package.json; then
    echo "📦 Blockly detected - This is expected to be large (~1-2MB)"
    echo "   💡 Consider loading Blockly dynamically if not needed on initial page"
fi

if grep -q "react-router" package.json; then
    echo "🛣️  React Router detected - Enable route-based code splitting"
fi

echo ""
echo "🚀 NEXT STEPS:"
echo "================================================="
echo "1. Run 'npm run build:analyze' for detailed bundle analysis"
echo "2. Check Network tab in DevTools to see actual load times"
echo "3. Test on slow 3G to simulate real-world performance"
echo "4. Consider implementing Service Worker for caching"
echo ""

# Generate a simple performance report
echo "📋 Performance Report saved to: performance-report.txt"
cat > performance-report.txt << EOF
SkyIDE Frontend Build Analysis Report
Generated: $(date)

Total Build Size: $TOTAL_SIZE
Target Size: <5MB (Recommended)
Status: $(if [ $total_mb -le 5 ]; then echo "✅ PASS"; else echo "⚠️ NEEDS OPTIMIZATION"; fi)

Largest Files:
$(find dist -type f \( -name "*.js" -o -name "*.css" \) -exec du -h {} + | sort -hr | head -5)

Recommendations:
- Enable gzip compression (can reduce size by 60-80%)
- Implement route-based code splitting
- Use dynamic imports for large libraries
- Optimize images and use modern formats (WebP, AVIF)
- Consider implementing a PWA for better caching

EOF

echo "✨ Analysis complete!"