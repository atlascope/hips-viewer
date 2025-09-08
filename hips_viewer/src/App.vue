<script setup lang="ts">
import { onMounted } from 'vue'
import { fetchImages } from '@/api'
import ImageView from '@/ImageView.vue'
import { currentImage, images, status } from './store'
import type { Image } from './types'

function imageIDFromURL() {
  let targetId: number | undefined
  const path = window.location.pathname
  const pattern = /\/images\/(\d+)/g
  path.matchAll(pattern).forEach((match) => {
    targetId = parseInt(match[1])
  })
  return targetId
}

onMounted(() => {
  const targetId = imageIDFromURL()
  fetchImages().then((data) => {
    images.value = data
    if (images.value.length) {
      if (targetId) {
        currentImage.value = images.value.find((im: Image) => im.id === targetId)
      }
      if (!currentImage.value) {
        currentImage.value = images.value[0]
      }
    }
  })

  window.addEventListener('popstate', function () {
    const targetId = imageIDFromURL()
    if (targetId) {
      currentImage.value = images.value.find((im: Image) => im.id === targetId)
    }
  })
})
</script>

<template>
  <v-toolbar
    color="background"
    height="40"
  >
    <v-img
      src="/logo.png"
      max-width="120"
      class="mx-6"
    />
    <v-spacer />
    <v-select
      v-model="currentImage"
      :items="images"
      item-title="name"
      max-width="300px"
      placeholder="Select an Image"
      :disabled="!!status"
      return-object
      hide-details
    />
  </v-toolbar>

  <ImageView
    v-if="currentImage"
    :id="currentImage.id"
    :image="currentImage"
  />
</template>

<style>
html, body, #app, .map-container, .map{
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  overflow: hidden;
}
.v-toolbar__content {
  display: flex;
  justify-content: space-between;
  padding: 4px 0px;
}
</style>
