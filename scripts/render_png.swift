import AppKit

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: swift scripts/render_png.swift INPUT.svg OUTPUT.png\n", stderr)
    exit(1)
}

let source = CommandLine.arguments[1]
let destination = CommandLine.arguments[2]
guard let image = NSImage(contentsOfFile: source) else {
    fputs("Could not load SVG\n", stderr)
    exit(1)
}
let width = Int(image.size.width)
let height = Int(image.size.height)
guard width > 0, height > 0,
      let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil,
                                    pixelsWide: width, pixelsHigh: height,
                                    bitsPerSample: 8, samplesPerPixel: 4,
                                    hasAlpha: true, isPlanar: false,
                                    colorSpaceName: .deviceRGB,
                                    bytesPerRow: 0, bitsPerPixel: 0),
      let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fputs("Could not create bitmap context\n", stderr)
    exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
image.draw(in: NSRect(x: 0, y: 0, width: width, height: height))
NSGraphicsContext.restoreGraphicsState()
guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Could not encode PNG\n", stderr)
    exit(1)
}
do {
    try png.write(to: URL(fileURLWithPath: destination))
    print(destination)
} catch {
    fputs("Could not write PNG: \(error)\n", stderr)
    exit(1)
}
