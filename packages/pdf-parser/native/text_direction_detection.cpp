/**
 * Text Direction Detection Implementation
 *
 * Implements automatic RTL/LTR detection using multi-signal analysis.
 * See text_direction_detection.h for API documentation.
 */

#include "text_direction_detection.h"
#include <algorithm>
#include <vector>
#include <cmath>

namespace PdfParser {

// ============================================================================
// INTERNAL STRUCTURES (not exposed in public API)
// ============================================================================

/**
 * Metrics for a single line of text
 */
struct LineMetrics {
    double leftEdge;
    double rightEdge;
    int rtlCharCount;
    int ltrCharCount;
};

/**
 * Aggregated direction analysis across all pages
 */
struct DirectionAnalysis {
    double leftEdgeVariance;
    double rightEdgeVariance;
    int totalRtlChars;
    int totalLtrChars;
    int ltrVotes;
    int rtlVotes;

    DirectionAnalysis()
        : leftEdgeVariance(0.0), rightEdgeVariance(0.0),
          totalRtlChars(0), totalLtrChars(0),
          ltrVotes(0), rtlVotes(0) {}
};

// ============================================================================
// INTERNAL HELPER FUNCTIONS (not exposed in public API)
// ============================================================================

// Forward declarations
static void CountScriptCharacters(const std::string& text, int& rtlCount, int& ltrCount);
static LineMetrics AnalyzeLine(const std::vector<ParsedTextPlacement>& line);
static std::vector<std::vector<ParsedTextPlacement>> GroupIntoLines(const ParsedTextPlacementList& placements);
static DirectionAnalysis AnalyzePageDirection(const ParsedTextPlacementListList& textsForPages);
static int DetermineAlignmentDirection(const DirectionAnalysis& analysis);
static int DetermineContentDirection(const DirectionAnalysis& analysis);

// Helper functions from TextComposer for line grouping (static to avoid symbol conflicts)
static const double LINE_HEIGHT_THRESHOLD = 5.0;

static int GetOrientationCode(const ParsedTextPlacement& a) {
    // Determine text orientation from transformation matrix
    // 1 0 0 1 = normal horizontal text
    if(a.matrix[0] > 0 && a.matrix[3] > 0)
        return 0;
    // 0 1 -1 0 = rotated 90 degrees
    if(a.matrix[1] > 0 && a.matrix[2] < 0)
        return 1;
    // -1 0 0 -1 = rotated 180 degrees
    if(a.matrix[0] < 0 && a.matrix[3] < 0)
        return 2;
    // Other orientations
    return 3;
}

static bool CompareForOrientation(const ParsedTextPlacement& a, const ParsedTextPlacement& b, int code) {
    if(code == 0) {
        // Normal horizontal: sort top-to-bottom, then left-to-right
        if(std::abs(a.globalBbox[1] - b.globalBbox[1]) > LINE_HEIGHT_THRESHOLD)
            return b.globalBbox[1] < a.globalBbox[1];
        else
            return a.globalBbox[0] < b.globalBbox[0];
    } else if(code == 1) {
        if(std::abs(a.globalBbox[0] - b.globalBbox[0]) > LINE_HEIGHT_THRESHOLD)
            return a.globalBbox[0] < b.globalBbox[0];
        else
            return a.globalBbox[1] < b.globalBbox[1];
    } else if(code == 2) {
        if(std::abs(a.globalBbox[1] - b.globalBbox[1]) > LINE_HEIGHT_THRESHOLD)
            return a.globalBbox[1] < b.globalBbox[1];
        else
            return b.globalBbox[0] < a.globalBbox[0];
    } else {
        // code 3
        if(std::abs(a.globalBbox[0] - b.globalBbox[0]) > LINE_HEIGHT_THRESHOLD)
            return b.globalBbox[0] < a.globalBbox[0];
        else
            return b.globalBbox[1] < a.globalBbox[1];
    }
}

static bool CompareParsedTextPlacement(const ParsedTextPlacement& a, const ParsedTextPlacement& b) {
    int codeA = GetOrientationCode(a);
    int codeB = GetOrientationCode(b);

    if(codeA == codeB) {
        return CompareForOrientation(a, b, codeA);
    }

    return codeA < codeB;
}

static bool AreSameLine(const ParsedTextPlacement& a, const ParsedTextPlacement& b) {
    int codeA = GetOrientationCode(a);
    int codeB = GetOrientationCode(b);

    if(codeA != codeB)
        return false;

    if(codeA == 0 || codeA == 2) {
        // Horizontal text: same line if Y-coordinates are close
        return std::abs(a.globalBbox[1] - b.globalBbox[1]) <= LINE_HEIGHT_THRESHOLD;
    } else {
        // Vertical text: same line if X-coordinates are close
        return std::abs(a.globalBbox[0] - b.globalBbox[0]) <= LINE_HEIGHT_THRESHOLD;
    }
}

void CountScriptCharacters(const std::string& text, int& rtlCount, int& ltrCount) {
    for (size_t i = 0; i < text.length(); ) {
        unsigned int codepoint = 0;
        int bytes = 0;

        // Decode UTF-8 to codepoint
        unsigned char c = static_cast<unsigned char>(text[i]);
        if (c < 0x80) {
            codepoint = c;
            bytes = 1;
        } else if ((c & 0xE0) == 0xC0 && i + 1 < text.length()) {
            codepoint = (c & 0x1F) << 6;
            codepoint |= (static_cast<unsigned char>(text[i+1]) & 0x3F);
            bytes = 2;
        } else if ((c & 0xF0) == 0xE0 && i + 2 < text.length()) {
            codepoint = (c & 0x0F) << 12;
            codepoint |= (static_cast<unsigned char>(text[i+1]) & 0x3F) << 6;
            codepoint |= (static_cast<unsigned char>(text[i+2]) & 0x3F);
            bytes = 3;
        } else if ((c & 0xF8) == 0xF0 && i + 3 < text.length()) {
            codepoint = (c & 0x07) << 18;
            codepoint |= (static_cast<unsigned char>(text[i+1]) & 0x3F) << 12;
            codepoint |= (static_cast<unsigned char>(text[i+2]) & 0x3F) << 6;
            codepoint |= (static_cast<unsigned char>(text[i+3]) & 0x3F);
            bytes = 4;
        } else {
            // Invalid UTF-8, skip this byte
            i++;
            continue;
        }

        // Check if RTL script
        if ((codepoint >= 0x0590 && codepoint <= 0x05FF) ||  // Hebrew
            (codepoint >= 0x0600 && codepoint <= 0x06FF) ||  // Arabic
            (codepoint >= 0x0700 && codepoint <= 0x074F) ||  // Syriac
            (codepoint >= 0x0780 && codepoint <= 0x07BF)) {  // Thaana
            rtlCount++;
        } else if ((codepoint >= 0x0041 && codepoint <= 0x005A) ||  // Latin uppercase
                   (codepoint >= 0x0061 && codepoint <= 0x007A) ||  // Latin lowercase
                   (codepoint >= 0x0400 && codepoint <= 0x04FF) ||  // Cyrillic
                   (codepoint >= 0x0370 && codepoint <= 0x03FF)) {  // Greek
            ltrCount++;
        }
        // Neutral characters (numbers, punctuation) - don't count

        i += bytes;
    }
}

/**
 * Analyze a single line to extract metrics
 */
static LineMetrics AnalyzeLine(const std::vector<ParsedTextPlacement>& line) {
    LineMetrics metrics;
    metrics.leftEdge = 0;
    metrics.rightEdge = 0;
    metrics.rtlCharCount = 0;
    metrics.ltrCharCount = 0;

    if (line.empty()) return metrics;

    // Find leftmost and rightmost positions
    metrics.leftEdge = line[0].globalBbox[0];
    metrics.rightEdge = line[0].globalBbox[2];

    for (const auto& placement : line) {
        metrics.leftEdge = std::min(metrics.leftEdge, placement.globalBbox[0]);
        metrics.rightEdge = std::max(metrics.rightEdge, placement.globalBbox[2]);

        // Analyze text content
        CountScriptCharacters(placement.text, metrics.rtlCharCount, metrics.ltrCharCount);
    }

    return metrics;
}

/**
 * Calculate variance of edge positions
 */
static double CalculateVariance(const std::vector<LineMetrics>& metrics, bool leftEdge) {
    if (metrics.size() < 2) return 0.0;

    // Calculate mean
    double sum = 0.0;
    for (const auto& m : metrics) {
        sum += leftEdge ? m.leftEdge : m.rightEdge;
    }
    double mean = sum / metrics.size();

    // Calculate variance
    double varianceSum = 0.0;
    for (const auto& m : metrics) {
        double value = leftEdge ? m.leftEdge : m.rightEdge;
        double diff = value - mean;
        varianceSum += diff * diff;
    }

    return varianceSum / metrics.size();
}

/**
 * Group text placements into lines based on Y-coordinate
 */
static std::vector<std::vector<ParsedTextPlacement>> GroupIntoLines(const ParsedTextPlacementList& placements) {
    // Convert list to vector and sort
    std::vector<ParsedTextPlacement> sorted(placements.begin(), placements.end());
    std::sort(sorted.begin(), sorted.end(), CompareParsedTextPlacement);

    // Group into lines
    std::vector<std::vector<ParsedTextPlacement>> lines;
    std::vector<ParsedTextPlacement> currentLine;

    for (const auto& placement : sorted) {
        if (currentLine.empty() || AreSameLine(currentLine.back(), placement)) {
            currentLine.push_back(placement);
        } else {
            if (!currentLine.empty()) {
                lines.push_back(currentLine);
            }
            currentLine = {placement};
        }
    }

    if (!currentLine.empty()) {
        lines.push_back(currentLine);
    }

    return lines;
}

void AnalyzePageDirection(const ParsedTextPlacementList& placements, DirectionAnalysis& analysis) {
    // Group placements into lines
    std::vector<std::vector<ParsedTextPlacement>> lines = GroupIntoLines(placements);

    // Need minimum lines for statistical significance
    if (lines.size() < 3) return;

    // Calculate metrics for each line
    std::vector<LineMetrics> lineMetrics;
    for (const auto& line : lines) {
        LineMetrics metrics = AnalyzeLine(line);
        lineMetrics.push_back(metrics);

        // Accumulate character counts
        analysis.totalRtlChars += metrics.rtlCharCount;
        analysis.totalLtrChars += metrics.ltrCharCount;
    }

    // Calculate variance of edges
    double leftVar = CalculateVariance(lineMetrics, true);
    double rightVar = CalculateVariance(lineMetrics, false);

    analysis.leftEdgeVariance += leftVar;
    analysis.rightEdgeVariance += rightVar;

    // Vote based on alignment (left aligned = LTR, right aligned = RTL)
    if (leftVar < rightVar * 0.7) {  // Left is significantly more aligned
        analysis.ltrVotes++;
    } else if (rightVar < leftVar * 0.7) {  // Right is significantly more aligned
        analysis.rtlVotes++;
    }
    // If similar variance, no vote (mixed/uncertain)
}

int DetermineAlignmentDirection(const DirectionAnalysis& analysis) {
    if (analysis.ltrVotes + analysis.rtlVotes > 0) {
        // Majority wins with 60% threshold
        double rtlRatio = static_cast<double>(analysis.rtlVotes) / (analysis.ltrVotes + analysis.rtlVotes);
        if (rtlRatio >= 0.6) return 1;  // RTL
        if (rtlRatio <= 0.4) return 0;  // LTR
    }

    // Fallback: compare overall variance
    if (analysis.leftEdgeVariance < analysis.rightEdgeVariance * 0.8) {
        return 0;  // LTR (left aligned)
    } else if (analysis.rightEdgeVariance < analysis.leftEdgeVariance * 0.8) {
        return 1;  // RTL (right aligned)
    }

    // Uncertain, default to LTR
    return 0;
}

int DetermineContentDirection(const DirectionAnalysis& analysis) {
    int totalChars = analysis.totalRtlChars + analysis.totalLtrChars;

    if (totalChars == 0) {
        return 0;  // No directional characters, default LTR
    }

    // Need significant RTL presence (2:1 ratio) to vote RTL
    if (analysis.totalRtlChars > analysis.totalLtrChars * 2) {
        return 1;  // RTL
    }

    return 0;  // LTR
}

int DetectTextDirection(const ParsedTextPlacementListList& textsForPages) {
    DirectionAnalysis analysis;
    // Initialize all fields
    analysis.leftEdgeVariance = 0;
    analysis.rightEdgeVariance = 0;
    analysis.totalRtlChars = 0;
    analysis.totalLtrChars = 0;
    analysis.ltrVotes = 0;
    analysis.rtlVotes = 0;

    // Analyze each page
    for (const auto& pagePlacements : textsForPages) {
        AnalyzePageDirection(pagePlacements, analysis);
    }

    // Combined decision with weighted voting
    int alignmentVote = DetermineAlignmentDirection(analysis);
    int contentVote = DetermineContentDirection(analysis);

    // If both agree, use that
    if (alignmentVote == contentVote) {
        return alignmentVote;
    }

    // Alignment signal is stronger (70% weight), prefer it
    return alignmentVote;
}

} // namespace PdfParser
