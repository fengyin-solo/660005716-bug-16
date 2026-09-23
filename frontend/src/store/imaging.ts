import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import type { VolumeData, ROIResult, WindowPreset } from '@/types'

export const useImagingStore = defineStore('imaging', () => {
  const loading = ref(false)
  const volumeData = ref<VolumeData | null>(null)
  const preset = ref('brain')
  const windowVal = ref(80)
  const levelVal = ref(40)
  const roiResults = ref<ROIResult[]>([])
  const mprSlice = ref({ axial: 32, coronal: 32, sagittal: 32 })

  // 请求序号：只接受最新一次请求的响应，慢返回的旧请求不能覆盖当前状态
  let volumeSeq = 0
  let roiSeq = 0

  async function loadVolume() {
    const seq = ++volumeSeq
    loading.value = true
    try {
      const { data } = await axios.post('/api/volume', {
        preset: preset.value, width: 64, height: 64, depth: 64
      })
      if (seq !== volumeSeq) return
      volumeData.value = data
      mprSlice.value = { axial: 32, coronal: 32, sagittal: 32 }
      // 新影像载入后，旧部位的 ROI 测量结果必须清空，避免汇总面板残留上一次的值
      roiResults.value = []
    } finally {
      if (seq === volumeSeq) loading.value = false
    }
  }

  async function analyzeROI(rois: any[]) {
    const seq = ++roiSeq
    loading.value = true
    try {
      const { data } = await axios.post('/api/roi', { volume: volumeData.value?.volume, rois })
      if (seq !== roiSeq) return
      roiResults.value = data.rois
    } finally {
      if (seq === roiSeq) loading.value = false
    }
  }

  function applyWindow(w: number, l: number) { windowVal.value = w; levelVal.value = l }

  return { loading, volumeData, preset, windowVal, levelVal, roiResults, mprSlice,
    loadVolume, analyzeROI, applyWindow }
})
