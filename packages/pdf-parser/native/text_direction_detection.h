/**
 * Text Direction Detection Module
 *
 * Automatic detection of text direction (LTR vs RTL) for PDF documents.
 * Uses multi-signal analysis combining:
 * 1. Alignment analysis (primary signal - 70% weight)
 * 2. Unicode script analysis (secondary signal - 30% weight)
 *
 * Public API: Only DetectTextDirection() is exposed.
 * All other functions and structures are internal implementation details.
 *
 * @see docs/phase-9-text-direction-detection.md for detailed algorithm description
 */

#ifndef TEXT_DIRECTION_DETECTION_H
#define TEXT_DIRECTION_DETECTION_H

#include "TextExtraction.h"

namespace PdfParser {

/**
 * Main text direction detection function
 *
 * Analyzes document layout and content to determine RTL vs LTR direction.
 * Uses multi-signal approach:
 * - Alignment analysis: Examines variance of text edge positions
 * - Unicode script analysis: Counts RTL vs LTR characters
 *
 * @param textsForPages Text placements for all pages from TextExtraction
 * @return 0 for LTR (Left-to-Right), 1 for RTL (Right-to-Left)
 */
int DetectTextDirection(const ParsedTextPlacementListList& textsForPages);

} // namespace PdfParser

#endif // TEXT_DIRECTION_DETECTION_H
