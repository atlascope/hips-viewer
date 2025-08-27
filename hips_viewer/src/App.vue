<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchImages } from '@/api'
import ImageView from '@/ImageView.vue'

const images = ref()
const currentImage = ref()

onMounted(() => {
  fetchImages().then((data) => {
    images.value = data
    if (images.value.length) currentImage.value = images.value[0]
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
    />
    <template #extension>
      <v-tabs
        v-model="currentImage"
        height="30"
        center-active
        grow
      >
        <v-tab
          v-for="image, index in images"
          :key="index"
          :text="image.name"
          :value="image"
        />

        <v-tab
          v-if="images && images.length == 0"
          value="no-image"
        >
          No images found
        </v-tab>
      </v-tabs>
    </template>
  </v-toolbar>

  <v-tabs-window v-model="currentImage">
    <v-tabs-window-item
      v-for="image, index in images"
      :key="index"
      :value="image"
    >
      <ImageView
        :id="index"
        :image="image"
      />
    </v-tabs-window-item>
  </v-tabs-window>
</template>

<style>
html, body, #app, .v-window, .v-window__container, .v-window-item, .map-container, .map{
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  overflow: hidden;
}
.v-toolbar__content {
  display: flex;
  justify-content: space-between;
  padding: 4px 16px;
}
.v-toolbar__extension {
  height: 30px !important;
}
</style>
