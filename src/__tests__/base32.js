import { safeBase32Encode, safeBase32Decode } from '../base32'

test.each(
  [
    /**
     * Encoded,
     * Decoded
     */
    [
      'F5KXGZLSOMXXC53FOJ2HS5LJN5YC6RDPMN2W2ZLOORZS64LXMVZHI6LVNFUS6ZLWMVZHSYTPN5VS22LPOMXWCL3CF5AXG43FORZS46DDMFZXGZLUOMXWIL2COJUWO2DUNZSXG4ZPOF3WK4TUPF2WS33QF5CG6Y3VNVSW45DTF5YXOZLSOR4XK2LJF5SXMZLSPFRG633LFVUW64ZPMEXWEL2BONZWK5DTFZ4GGYLTONSXI4ZPMQXUE4TJM5UHI3T/FONZS6QTSNFTWQ5DOMVZXGICCOJUWO2DUEBDXEZLZFZUW2YLHMVZWK5BPIJZGSZ3IORXGK43TEBBHE2LHNB2CAR3SMV4S42LNMFTWK43FOQXUAMLYEBBHE2LHNB2G4ZLTOMQEE4TJM5UHIICHOJSXSLTQNZTQ====',
      '/Users/qwertyuiop/Documents/qwertyuii/everybook-ios/a/b/Assets.xcassets/d/Brightness/qwertyuiop/Documents/qwertyuii/everybook-ios/a/b/Assets.xcassets/d/Brightness/Brightness Bright Grey.imageset/Brightness Bright Grey.imageset/@1x Brightness Bright Grey.png'
    ]
  ]
)('Decoding from `%s` should give `%s` and vice versa', (encoded, decoded) => {
  expect(safeBase32Decode(encoded)).toEqual(decoded)
  expect(safeBase32Encode(decoded)).toEqual(encoded)
})
