import readPixelRatioFromPath from '../read_pixel_ratio_from_path'

describe('pixel ratio should be read from path', () => {
  test.each([
    /**
     * [
     *  'input path',
     *  expected pixel ratio
     * ]
     */
    [
      '/root/random_path.png',
      NaN
    ],
    [
      '/root/image_pixel_ratio_2.png',
      2
    ],
    [
      '/root/other path/file_PiXeL_RaTiO_56.jpg',
      56
    ],
    [
      '/root/some_file_pixel_ratio_42_pixel_ratio_6.pixel_ratio_4.jpg',
      42
    ],
    [
      '/tmp/screenshot/screen_a.pixel_RATIO_556',
      556
    ]
  ])('`readPixelRatioFromPath(%s)` should return %p', (path, expected) => {
    expect(readPixelRatioFromPath(path)).toBe(expected)
  })
})
